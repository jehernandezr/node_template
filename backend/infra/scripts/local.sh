#!/usr/bin/env bash
# Local environment: Docker Compose (PostgreSQL, Valkey, LocalStack, Mailpit, OpenObserve) and the
# Terraform of the local environment against LocalStack.
#   backend/infra/scripts/local.sh up           # starts the containers and waits until they are healthy
#   backend/infra/scripts/local.sh tf plan      # plan of platform and messaging against LocalStack
#   backend/infra/scripts/local.sh tf apply     # apply against LocalStack (state in its S3)
#   backend/infra/scripts/local.sh tf destroy
#   backend/infra/scripts/local.sh down         # stops the containers (keeps the volumes)
#   backend/infra/scripts/local.sh reset        # removes containers and volumes
# LocalStack creates the queues and topics of topology.json by itself on startup
# (backend/infra/local/localstack/init-aws.sh). The local Terraform uses another prefix
# (node-template-local) so it does not collide with those resources.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$BACKEND_DIR/infra/terraform"
ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
STACKS=(platform messaging)

# Fake credentials that LocalStack accepts. They are never real credentials.
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

compose() {
  docker compose -f "$BACKEND_DIR/docker-compose.yml" "$@"
}

state_bucket() {
  grep -E '^bucket' "$TF_DIR/environments/local/platform/backend.tfvars" | cut -d'"' -f2
}

# The state bucket lives in the LocalStack S3; it is created if missing.
ensure_state_bucket() {
  local bucket
  bucket="$(state_bucket)"
  if ! curl -fs "$ENDPOINT/_localstack/health" >/dev/null; then
    echo "LocalStack does not answer at $ENDPOINT. Run first: $0 up" >&2
    exit 1
  fi
  curl -fs -o /dev/null -X PUT "$ENDPOINT/$bucket" || true
}

tf() {
  local action=${1:?Missing the action: plan, apply or destroy} stack list
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
      *) echo "Invalid action: $action" >&2; exit 1 ;;
    esac
  done
}

case "${1:-up}" in
  up) compose up -d --wait ;;
  tf) tf "${2:-plan}" ;;
  down) compose down ;;
  reset) compose down -v ;;
  *) echo "Usage: $0 [up|tf <plan|apply|destroy>|down|reset]" >&2; exit 1 ;;
esac
