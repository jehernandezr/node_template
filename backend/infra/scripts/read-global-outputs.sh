#!/usr/bin/env bash
# Reads the outputs of the account's global stack and leaves them as ARTIFACTS_BUCKET and ECR_PREFIX.
# Usage: read-global-outputs.sh <environment>
# Writes to $GITHUB_ENV if it exists; outside Actions it prints them on stdout.
# Fails if the global stack of the environment has not been applied (docs/runbooks/first-deploy.md).
# Variables: DRY_RUN=1 prints the commands and leaves <dry-run> as the value.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: read-global-outputs.sh <environment>}"
require_identifier "environment" "$ENVIRONMENT"
cd "$REPO_ROOT"

run terraform -chdir="$TF_ROOT/stacks/global" init -input=false -reconfigure \
  -backend-config="$TF_ROOT/environments/$ENVIRONMENT/global/backend.tfvars"

bucket="$(capture terraform -chdir="$TF_ROOT/stacks/global" output -raw artifacts_bucket)"
prefix="$(capture terraform -chdir="$TF_ROOT/stacks/global" output -raw ecr_repository_prefix)"

if ! is_dry && [[ -z "$bucket" || -z "$prefix" ]]; then
  log "The global stack of $ENVIRONMENT has no artifacts_bucket or ecr_repository_prefix: apply it first"
  exit 1
fi

export_value ARTIFACTS_BUCKET "$bucket"
export_value ECR_PREFIX "$prefix"
