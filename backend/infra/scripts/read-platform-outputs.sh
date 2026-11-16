#!/usr/bin/env bash
# Lee las salidas github_oidc del stack platform y las deja como ARTIFACTS_BUCKET y ECR_PREFIX.
# Uso: read-platform-outputs.sh <ambiente>
# Escribe en $GITHUB_ENV si existe; fuera de Actions las imprime en stdout.
# Falla si github_repository no está configurado en platform (la salida es null).
# Variables: DRY_RUN=1 imprime los comandos y deja <dry-run> como valor.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: read-platform-outputs.sh <ambiente>}"
require_identifier "ambiente" "$ENVIRONMENT"
cd "$REPO_ROOT"

run terraform -chdir="$TF_ROOT/stacks/platform" init -input=false -reconfigure \
  -backend-config="$TF_ROOT/environments/$ENVIRONMENT/platform/backend.tfvars"

oidc_json="$(capture terraform -chdir="$TF_ROOT/stacks/platform" output -json github_oidc)"

if is_dry; then
  bucket='<dry-run>'
  prefix='<dry-run>'
else
  if [[ -z "$oidc_json" || "$oidc_json" == "null" ]]; then
    log "github_oidc es null: configura github_repository en environments/$ENVIRONMENT/platform/terraform.tfvars y aplica platform"
    exit 1
  fi
  bucket="$(json_get "$oidc_json" 'o.artifacts_bucket')"
  prefix="$(json_get "$oidc_json" 'o.ecr_repository_prefix')"
  if [[ -z "$bucket" || -z "$prefix" ]]; then
    log "github_oidc no trae artifacts_bucket o ecr_repository_prefix"
    exit 1
  fi
fi

export_value ARTIFACTS_BUCKET "$bucket"
export_value ECR_PREFIX "$prefix"
