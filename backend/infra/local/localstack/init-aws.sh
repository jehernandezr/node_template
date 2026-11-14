#!/usr/bin/env bash
# Recursos base de LocalStack para desarrollo local.
# LocalStack ejecuta este script al quedar listo (ready.d).
set -euo pipefail

BUCKET="platform-files-local"
TOPOLOGY="/etc/localstack/topology.json"
PREFIX="${MESSAGING_NAME_PREFIX:-local}"

if awslocal s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "[init-aws] El bucket ${BUCKET} ya existe"
else
  awslocal s3 mb "s3://${BUCKET}"
  echo "[init-aws] Bucket ${BUCKET} creado"
fi

# Tópicos, colas, DLQ y suscripciones desde la topología confirmada en git
# (backend/infra/terraform/topology.json), con los mismos nombres y filtros que AWS.
# El intérprete de LocalStack ya trae boto3.
PYTHON="/opt/code/localstack/.venv/bin/python"
if [[ ! -x "${PYTHON}" ]]; then
  PYTHON="python3"
fi

if [[ -f "${TOPOLOGY}" ]]; then
  "${PYTHON}" /etc/localstack/topology.py "${TOPOLOGY}" "${PREFIX}"
  echo "[init-aws] Topología aplicada con el prefijo ${PREFIX}"
else
  echo "[init-aws] No se encontró ${TOPOLOGY}: no se crean colas ni tópicos" >&2
fi
