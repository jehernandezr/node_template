#!/usr/bin/env bash
# Sube la web compilada al bucket de la web del ambiente e invalida CloudFront.
# Uso: publish-web.sh <ambiente>
# Variables: NAME_PREFIX y AWS_REGION (obligatorias). Requiere haber corrido flutter build web
# en front/apps/web. Los archivos de arranque y los manifiestos van con no-cache; el resto,
# inmutable. Si CloudFront no tiene distribución para el bucket, termina sin invalidar.
# DRY_RUN=1 imprime los comandos.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: publish-web.sh <ambiente>}"
require_identifier "ambiente" "$ENVIRONMENT"
: "${NAME_PREFIX:?falta NAME_PREFIX}"
: "${AWS_REGION:?falta AWS_REGION}"
cd "$REPO_ROOT"

web_dir="$REPO_ROOT/front/apps/web/build/web"
if ! is_dry && [[ ! -d "$web_dir" ]]; then
  log "No existe $web_dir: corre flutter build web --release antes"
  exit 1
fi

account="$(capture aws sts get-caller-identity --query Account --output text)"
bucket="$NAME_PREFIX-web-$account"
log "Publicando la web de $ENVIRONMENT en s3://$bucket"

run aws s3 sync "$web_dir" "s3://$bucket" --delete \
  --cache-control 'public,max-age=31536000,immutable' \
  --exclude index.html \
  --exclude flutter_service_worker.js \
  --exclude version.json \
  --exclude 'assets/AssetManifest*' \
  --exclude 'assets/FontManifest.json'

run aws s3 sync "$web_dir" "s3://$bucket" \
  --exclude '*' \
  --include index.html \
  --include flutter_service_worker.js \
  --include version.json \
  --include 'assets/AssetManifest*' \
  --include 'assets/FontManifest.json' \
  --cache-control 'no-cache'

distribution="$(capture aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[].DomainName, '$bucket.s3.$AWS_REGION.amazonaws.com')].Id | [0]" \
  --output text)"

if [[ -z "$distribution" || "$distribution" == "None" ]]; then
  log "Ninguna distribución de CloudFront apunta a $bucket: no hay nada que invalidar"
  exit 0
fi

run aws cloudfront create-invalidation --distribution-id "$distribution" --paths '/*'
