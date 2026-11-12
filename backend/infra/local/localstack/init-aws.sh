#!/usr/bin/env bash
# Recursos base de LocalStack para desarrollo local.
# LocalStack ejecuta este script al quedar listo (ready.d).
set -euo pipefail

BUCKET="platform-files-local"

if awslocal s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "[init-aws] El bucket ${BUCKET} ya existe"
else
  awslocal s3 mb "s3://${BUCKET}"
  echo "[init-aws] Bucket ${BUCKET} creado"
fi

echo "[init-aws] Las colas y tópicos se crearán desde la topología de mensajería más adelante"
