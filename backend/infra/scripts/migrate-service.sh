#!/usr/bin/env bash
# Applies the migrations of a service against the database of its environment.
# Usage: migrate-service.sh <environment> <service>
#
# The runner that executes this script must reach the database (RDS Proxy inside the VPC), which is why
# deploy.yml uses vars.DEPLOY_RUNNER: a self-hosted runner inside the VPC, not one hosted by GitHub.
#
# Reads the migrate_task output of the service's service-base stack and exports its environment, the one the
# migrate task gets: DB_AUTH=iam with the service's owner role as DB_USER (ADR 0041). The pool signs an
# IAM token per connection with the runner's credentials, so its role needs rds-db:connect for that owner role.
# No database password is read. <service> is the folder and Nx project name.
# DRY_RUN=1 reads with capture, exports nothing and runs migrate only as a printed command.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: migrate-service.sh <environment> <service>}"
SERVICE="${2:?usage: migrate-service.sh <environment> <service>}"
require_identifier "environment" "$ENVIRONMENT"
require_identifier "service" "$SERVICE"
cd "$REPO_ROOT"

base_stack="$TF_ROOT/stacks/service-base"
base_backend="$TF_ROOT/environments/$ENVIRONMENT/services/$SERVICE/base/backend.tfvars"

run terraform -chdir="$base_stack" init -input=false -reconfigure -backend-config="$base_backend"

migrate_json="$(capture terraform -chdir="$base_stack" output -json migrate_task)"

if is_dry; then
  dry_text 'export the environment of migrate_task'
else
  if [[ -z "$(json_get "$migrate_json" 'o.environment.DB_USER')" ]]; then
    log "The service-base stack of $SERVICE in $ENVIRONMENT gives its migrate task no database: apply it first"
    exit 1
  fi
  while IFS= read -r -d '' pair; do
    export "${pair?}"
  done < <(printf '%s' "$migrate_json" | node -e "
    const o = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
    for (const [key, value] of Object.entries(o.environment)) process.stdout.write(key + '=' + value + '\0');
  ")
fi

run pnpm nx run "$SERVICE:migrate"
