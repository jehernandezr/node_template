#!/usr/bin/env bash
# Entorno local: Docker Compose (PostgreSQL, Valkey, LocalStack, Mailpit, OpenObserve) y el
# Terraform del ambiente local contra LocalStack.
#   backend/infra/scripts/local.sh up           # levanta los contenedores y espera a que estén sanos
#   backend/infra/scripts/local.sh tf plan      # plan de platform y messaging contra LocalStack
#   backend/infra/scripts/local.sh tf apply     # apply contra LocalStack (estado en su S3)
#   backend/infra/scripts/local.sh tf destroy
#   backend/infra/scripts/local.sh down         # detiene los contenedores (conserva los volúmenes)
#   backend/infra/scripts/local.sh reset        # borra contenedores y volúmenes
# LocalStack crea por sí solo las colas y tópicos de topology.json al arrancar
# (backend/infra/local/localstack/init-aws.sh). El Terraform local usa otro prefijo
# (node-template-local) para no chocar con esos recursos.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$BACKEND_DIR/infra/terraform"
ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
STACKS=(platform messaging)

# Credenciales ficticias que LocalStack acepta. Nunca son credenciales reales.
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

compose() {
  docker compose -f "$BACKEND_DIR/docker-compose.yml" "$@"
}

state_bucket() {
  grep -E '^bucket' "$TF_DIR/environments/local/platform/backend.tfvars" | cut -d'"' -f2
}

# El bucket del estado vive en el S3 de LocalStack; se crea si falta.
ensure_state_bucket() {
  local bucket
  bucket="$(state_bucket)"
  if ! curl -fs "$ENDPOINT/_localstack/health" >/dev/null; then
    echo "LocalStack no responde en $ENDPOINT. Corre primero: $0 up" >&2
    exit 1
  fi
  curl -fs -o /dev/null -X PUT "$ENDPOINT/$bucket" || true
}

tf() {
  local action=${1:?Falta la acción: plan, apply o destroy} stack list
  ensure_state_bucket
  list=("${STACKS[@]}")
  if [[ "$action" == destroy ]]; then
    list=(messaging platform)
  fi
  for stack in "${list[@]}"; do
    local values="$TF_DIR/environments/local/$stack"
    echo "==> terraform $action $stack (local)"
    terraform -chdir="$TF_DIR/stacks/$stack" init -input=false -reconfigure \
      -backend-config="$values/backend.tfvars" >/dev/null
    case "$action" in
      plan) terraform -chdir="$TF_DIR/stacks/$stack" plan -input=false -var-file="$values/terraform.tfvars" ;;
      apply | destroy)
        terraform -chdir="$TF_DIR/stacks/$stack" "$action" -input=false -auto-approve \
          -var-file="$values/terraform.tfvars"
        ;;
      *) echo "Acción no válida: $action" >&2; exit 1 ;;
    esac
  done
}

case "${1:-up}" in
  up) compose up -d --wait ;;
  tf) tf "${2:-plan}" ;;
  down) compose down ;;
  reset) compose down -v ;;
  *) echo "Uso: $0 [up|tf <plan|apply|destroy>|down|reset]" >&2; exit 1 ;;
esac
