#!/usr/bin/env bash
# Reads the github_oidc outputs of the platform stack and leaves them as ARTIFACTS_BUCKET and ECR_PREFIX.
# Usage: read-platform-outputs.sh <environment>
# Writes to $GITHUB_ENV if it exists; outside Actions it prints them on stdout.
# Fails if github_repository is not set in platform (the output is null).
# Variables: DRY_RUN=1 prints the commands and leaves <dry-run> as the value.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: read-platform-outputs.sh <environment>}"
require_identifier "environment" "$ENVIRONMENT"
cd "$REPO_ROOT"

run terraform -chdir="$TF_ROOT/stacks/platform" init -input=false -reconfigure \
  -backend-config="$TF_ROOT/environments/$ENVIRONMENT/platform/backend.tfvars"

oidc_json="$(capture terraform -chdir="$TF_ROOT/stacks/platform" output -json github_oidc)"

if is_dry; then
  bucket='<dry-run>'
  prefix='<dry-run>'
else
  if [[ -z "$oidc_json" || "$oidc_json" == "null" ]]; then
    log "github_oidc is null: set github_repository in environments/$ENVIRONMENT/platform/terraform.tfvars and apply platform"
    exit 1
  fi
  bucket="$(json_get "$oidc_json" 'o.artifacts_bucket')"
  prefix="$(json_get "$oidc_json" 'o.ecr_repository_prefix')"
  if [[ -z "$bucket" || -z "$prefix" ]]; then
    log "github_oidc has no artifacts_bucket or ecr_repository_prefix"
    exit 1
  fi
fi

export_value ARTIFACTS_BUCKET "$bucket"
export_value ECR_PREFIX "$prefix"
