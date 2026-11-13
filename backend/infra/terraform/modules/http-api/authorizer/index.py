"""Autorizador de API Gateway: solo deja pasar lo que llega por CloudFront.

CloudFront agrega X-Origin-Verify con un secreto. API Gateway responde 401 sin invocar
esta función cuando falta el encabezado y guarda en caché la respuesta por valor.
"""

import hmac
import os

import boto3

_expected = None


def _expected_value():
    global _expected
    if _expected is None:
        client = boto3.client("secretsmanager")
        secret = client.get_secret_value(SecretId=os.environ["ORIGIN_VERIFY_SECRET_ARN"])
        _expected = secret["SecretString"]
    return _expected


def handler(event, _context):
    headers = event.get("headers") or {}
    received = headers.get("x-origin-verify", "")
    return {"isAuthorized": hmac.compare_digest(received, _expected_value())}
