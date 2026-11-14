"""Autorizador de API Gateway: solo deja pasar lo que llega por CloudFront.

CloudFront agrega X-Origin-Verify con un secreto. API Gateway responde 401 sin invocar
esta función cuando falta el encabezado y guarda en caché la respuesta por valor.

Al rotar, platform guarda un valor nuevo (AWSCURRENT) y el anterior pasa a AWSPREVIOUS,
pero CloudFront sigue enviando el anterior hasta que se aplica edge. Por eso se aceptan los
dos y el secreto se recarga cada pocos minutos: un contenedor caliente no se queda con un
valor que ya no envía nadie.
"""

import hmac
import os
import time

# Debe ser menor que la espera entre aplicar platform y edge al rotar.
RELOAD_SECONDS = int(os.environ.get("ORIGIN_VERIFY_RELOAD_SECONDS", "300"))
STAGES = ("AWSCURRENT", "AWSPREVIOUS")

_client = None
_cache = {"values": (), "loaded_at": None}


def _secrets_client():
    global _client
    if _client is None:
        import boto3  # Viene en el runtime de Lambda.

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
            # Antes de la primera rotación no existe AWSPREVIOUS.
            continue
        values.append(response["SecretString"])
    return tuple(values)


def _expected_values(now):
    loaded_at = _cache["loaded_at"]
    if loaded_at is None or now - loaded_at >= RELOAD_SECONDS:
        try:
            _cache["values"] = _load()
        except Exception:
            # Un fallo de Secrets Manager no corta la API mientras haya valores conocidos.
            if not _cache["values"]:
                raise
        _cache["loaded_at"] = now
    return _cache["values"]


def handler(event, _context, now=None):
    received = (event.get("headers") or {}).get("x-origin-verify", "")
    expected = _expected_values(time.monotonic() if now is None else now)
    # Compara contra todos sin cortar en el primero que coincide.
    matches = [hmac.compare_digest(received, value) for value in expected]
    return {"isAuthorized": any(matches)}
