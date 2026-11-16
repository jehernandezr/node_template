#!/usr/bin/env bash
# Aplica las migraciones de un servicio contra la base de datos de su ambiente.
# Uso: migrate-service.sh <ambiente> <servicio>
#
# El runner que ejecuta este script debe alcanzar la base (RDS Proxy dentro de la VPC), por eso
# deploy.yml usa vars.DEPLOY_RUNNER: un runner propio dentro de la VPC, no uno hospedado por GitHub.
#
# Lee las salidas db, service_databases y db_service_secret_arns del stack data, obtiene las
# credenciales del servicio de Secrets Manager, las enmascara en los logs y exporta DB_PROXY_HOST,
# DB_PORT, DB_DATABASES y DB_CREDENTIALS para pnpm nx run <servicio>:migrate.
# DRY_RUN=1 lee con capture, no exporta valores reales y ejecuta el migrate solo como comando impreso.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: migrate-service.sh <ambiente> <servicio>}"
SERVICE="${2:?uso: migrate-service.sh <ambiente> <servicio>}"
require_identifier "ambiente" "$ENVIRONMENT"
require_identifier "servicio" "$SERVICE"
cd "$REPO_ROOT"

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
  dry_text 'echo "::add-mask::<credenciales de la base>"'
else
  proxy_host="$(json_get "$db_json" 'o.proxy_endpoint')"
  port="$(json_get "$db_json" 'o.port')"
  databases="$(json_get "$databases_json" "o['$SERVICE']")"
  secret_arn="$(json_get "$secrets_json" "o['$SERVICE']")"
  if [[ -z "$databases" || -z "$secret_arn" ]]; then
    log "El servicio $SERVICE no está en service_databases de $ENVIRONMENT: agrégalo al stack data"
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
