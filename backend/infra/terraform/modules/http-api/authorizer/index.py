"""API Gateway authorizer: only lets through what arrives through CloudFront.

CloudFront adds X-Origin-Verify with a secret. API Gateway answers 401 without invoking
this function when the header is missing and caches the answer by value.

On rotation, platform stores a new value (AWSCURRENT) and the previous one moves to AWSPREVIOUS,
but CloudFront keeps sending the previous one until edge is applied. That is why both are
accepted and the secret is reloaded every few minutes: a warm container does not keep a
value that nobody sends any more.
"""

import hmac
import os
import time

# Must be shorter than the wait between applying platform and edge on rotation.
RELOAD_SECONDS = int(os.environ.get("ORIGIN_VERIFY_RELOAD_SECONDS", "300"))
STAGES = ("AWSCURRENT", "AWSPREVIOUS")

_client = None
_cache = {"values": (), "loaded_at": None}


def _secrets_client():
    global _client
    if _client is None:
        import boto3  # Ships with the Lambda runtime.

        _client = boto3.client("secretsmanager")
    return _client


def _load():
    client = _secrets_client()
    values = []
    for stage in STAGES:
        try:
            response = client.get_secret_value(
                SecretId=os.environ["ORIGIN_VERIFY_SECRET_ARN"], VersionStage=stage
            )
        except client.exceptions.ResourceNotFoundException:
            # Before the first rotation AWSPREVIOUS does not exist.
            continue
        values.append(response["SecretString"])
    return tuple(values)


def _expected_values(now):
    loaded_at = _cache["loaded_at"]
    if loaded_at is None or now - loaded_at >= RELOAD_SECONDS:
        try:
            _cache["values"] = _load()
        except Exception:
            # A Secrets Manager failure does not cut off the API while there are known values.
            if not _cache["values"]:
                raise
        _cache["loaded_at"] = now
    return _cache["values"]


def handler(event, _context, now=None):
    received = (event.get("headers") or {}).get("x-origin-verify", "")
    expected = _expected_values(time.monotonic() if now is None else now)
    # Compares against all of them without stopping at the first match.
    matches = [hmac.compare_digest(received, value) for value in expected]
    return {"isAuthorized": any(matches)}
