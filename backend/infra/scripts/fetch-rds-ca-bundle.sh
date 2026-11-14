#!/usr/bin/env bash
# Descarga el bundle público de CA de RDS junto al handler de la Lambda de bootstrap, que lo
# usa para verificar el certificado de la instancia. Se corre una vez y el archivo se
# confirma en git; volver a correrlo cuando AWS publique CA nuevas.
#   backend/infra/scripts/fetch-rds-ca-bundle.sh
set -euo pipefail

URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
TARGET="$(cd "$(dirname "$0")/../terraform/modules/rds-postgres/lambda/db_bootstrap" && pwd)/rds-ca-bundle.pem"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

curl -fsSL --proto '=https' --tlsv1.2 -o "$TMP" "$URL"

# Solo certificados PEM: nada de HTML de error ni archivos vacíos.
count="$(grep -c -- '-----BEGIN CERTIFICATE-----' "$TMP" || true)"
if [[ "$count" -eq 0 ]] || grep -qv -e '^-----BEGIN CERTIFICATE-----$' -e '^-----END CERTIFICATE-----$' -e '^[A-Za-z0-9+/=]*$' "$TMP"; then
  echo "La descarga de $URL no es un bundle PEM" >&2
  exit 1
fi
if command -v openssl >/dev/null; then
  openssl crl2pkcs7 -nocrl -certfile "$TMP" >/dev/null
fi

mv "$TMP" "$TARGET"
trap - EXIT
echo "Bundle de RDS con $count certificados en $TARGET"
