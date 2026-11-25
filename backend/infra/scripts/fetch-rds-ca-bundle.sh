#!/usr/bin/env bash
# Downloads the public RDS CA bundle next to the bootstrap Lambda handler, which uses it
# to verify the instance certificate. Run it once and commit the file to git; run it
# again when AWS publishes new CAs.
#   backend/infra/scripts/fetch-rds-ca-bundle.sh
set -euo pipefail

URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
TARGET="$(cd "$(dirname "$0")/../terraform/modules/rds-postgres/lambda/db_bootstrap" && pwd)/rds-ca-bundle.pem"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

curl -fsSL --proto '=https' --tlsv1.2 -o "$TMP" "$URL"

# PEM certificates only: no error HTML and no empty files.
count="$(grep -c -- '-----BEGIN CERTIFICATE-----' "$TMP" || true)"
if [[ "$count" -eq 0 ]] || grep -qv -e '^-----BEGIN CERTIFICATE-----$' -e '^-----END CERTIFICATE-----$' -e '^[A-Za-z0-9+/=]*$' "$TMP"; then
  echo "The download from $URL is not a PEM bundle" >&2
  exit 1
fi
if command -v openssl >/dev/null; then
  openssl crl2pkcs7 -nocrl -certfile "$TMP" >/dev/null
fi

mv "$TMP" "$TARGET"
trap - EXIT
echo "RDS bundle with $count certificates in $TARGET"
