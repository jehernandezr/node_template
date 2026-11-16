#!/usr/bin/env bash
# Sube el .aab compilado al bucket de artefactos, bajo la etiqueta del commit.
# Uso: publish-mobile.sh <ambiente>
# Variables: ARTIFACTS_BUCKET, GIT_SHA y AWS_REGION (obligatorias). La subida a las tiendas y la
# firma de release no se automatizan aquí: exigen credenciales del titular de la cuenta.
# DRY_RUN=1 imprime los comandos y no exige el archivo.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: publish-mobile.sh <ambiente>}"
require_identifier "ambiente" "$ENVIRONMENT"
: "${ARTIFACTS_BUCKET:?falta ARTIFACTS_BUCKET}"
: "${GIT_SHA:?falta GIT_SHA}"
: "${AWS_REGION:?falta AWS_REGION}"
cd "$REPO_ROOT"

aab="$REPO_ROOT/front/apps/mobile/build/app/outputs/bundle/release/app-release.aab"
if ! is_dry && [[ ! -f "$aab" ]]; then
  log "No existe $aab: corre flutter build appbundle --release antes"
  exit 1
fi

run aws s3 cp "$aab" "s3://$ARTIFACTS_BUCKET/mobile/$GIT_SHA/app-release.aab" --region "$AWS_REGION"
log "App móvil de $ENVIRONMENT subida al bucket de artefactos"
