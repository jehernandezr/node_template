#!/usr/bin/env bash
# Applies the migrations of a service against the database of its environment.
# Usage: migrate-service.sh <environment> <service>
#
# The runner that executes this script must reach the database (RDS Proxy inside the VPC), which is why
# deploy.yml uses vars.DEPLOY_RUNNER: a self-hosted runner inside the VPC, not one hosted by GitHub.
#
# Reads the db, service_databases and db_service_secret_arns outputs of the data stack, gets the
# credentials of the service from Secrets Manager, masks them in the logs and exports DB_PROXY_HOST,
# DB_PORT, DB_DATABASES and DB_CREDENTIALS for pnpm nx run <service>:migrate. <service> is the folder and
# Nx project name; the data stack keys it by the service_name the catalog gives it.
# DRY_RUN=1 reads with capture, exports no real values and runs migrate only as a printed command.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: migrate-service.sh <environment> <service>}"
SERVICE="${2:?usage: migrate-service.sh <environment> <service>}"
require_identifier "environment" "$ENVIRONMENT"
require_identifier "service" "$SERVICE"
cd "$REPO_ROOT"

entry="$(node "$SCRIPTS_DIR/service-catalog-cli.mjs" entry "$ENVIRONMENT" "$SERVICE")"
service_name="$(json_get "$entry" 'o.serviceName')"

data_stack="$TF_ROOT/stacks/data"
data_backend="$TF_ROOT/environments/$ENVIRONMENT/data/backend.tfvars"

run terraform -chdir="$data_stack" init -input=false -reconfigure -backend-config="$data_backend"

db_json="$(capture terraform -chdir="$data_stack" output -json db)"
databases_json="$(capture terraform -chdir="$data_stack" output -json service_databases)"
secrets_json="$(capture terraform -chdir="$data_stack" output -json db_service_secret_arns)"

if is_dry; then
  proxy_host='<dry-run>'
  port='<dry-run>'
  databases='<dry-run>'
  secret_arn='<dry-run>'
  credentials="$(capture aws secretsmanager get-secret-value --secret-id "$secret_arn" \
    --query SecretString --output text)"
  dry_text 'echo "::add-mask::<database credentials>"'
else
  proxy_host="$(json_get "$db_json" 'o.proxy_endpoint')"
  port="$(json_get "$db_json" 'o.port')"
  databases="$(json_get "$databases_json" "o['$service_name']")"
  secret_arn="$(json_get "$secrets_json" "o['$service_name']")"
  if [[ -z "$databases" || -z "$secret_arn" ]]; then
    log "The service $service_name is not in service_databases of $ENVIRONMENT: add it to the data stack"
    exit 1
  fi
  credentials="$(aws secretsmanager get-secret-value --secret-id "$secret_arn" \
    --query SecretString --output text)"
  password="$(json_get "$credentials" 'o.password')"
  echo "::add-mask::$credentials"
  echo "::add-mask::$password"
  export DB_PROXY_HOST="$proxy_host"
  export DB_PORT="$port"
  export DB_DATABASES="$databases"
  export DB_CREDENTIALS="$credentials"
fi

run pnpm nx run "$SERVICE:migrate"
