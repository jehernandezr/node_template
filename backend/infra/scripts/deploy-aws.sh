#!/usr/bin/env bash
# Terraform por stack contra AWS. Lo usan el pipeline y las personas, con las mismas reglas.
#   ENV=dev deploy-aws.sh plan    [all|<stack>]       # plan de un stack o de todos, en orden
#   ENV=dev deploy-aws.sh apply   [all|<stack>]       # apply: network, platform, data, messaging, edge
#   ENV=dev deploy-aws.sh destroy [all|<stack>]       # destroy en orden inverso
#   ENV=dev deploy-aws.sh plan    service <servicio>  # stack de un servicio (estado propio)
#   ENV=dev deploy-aws.sh apply   service <servicio>
# Variables: ENV (dev), AUTO_APPROVE=1 omite la confirmación. Los artefactos de un servicio
# llegan como TF_VAR_image y TF_VAR_lambda_package. Credenciales: OIDC en CI, perfil en local.
set -euo pipefail

TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"
ENV="${ENV:-dev}"
ORDER=(network platform data messaging edge)

if [[ "$ENV" == "local" ]]; then
  echo "Para el ambiente local usa backend/infra/scripts/local.sh" >&2
  exit 1
fi

# Stacks del ambiente en el orden de dependencias.
stacks_of_env() {
  local stack
  for stack in "${ORDER[@]}"; do
    [[ -d "$TF_DIR/environments/$ENV/$stack" ]] && echo "$stack"
  done
}

selected() {
  case "${1:-all}" in
    all) stacks_of_env ;;
    *) echo "$1" ;;
  esac
}

# $1: carpeta del stack (stacks/<x>), $2: carpeta de valores (environments/<env>/<y>).
tf_run() {
  local code="$TF_DIR/stacks/$1" values="$TF_DIR/environments/$ENV/$2"
  shift 2
  if [[ ! -f "$values/terraform.tfvars" ]]; then
    echo "No existe $values/terraform.tfvars" >&2
    exit 1
  fi
  terraform -chdir="$code" init -input=false -reconfigure -backend-config="$values/backend.tfvars" >/dev/null
  terraform -chdir="$code" "$@" -input=false -var-file="$values/terraform.tfvars" ${AUTO_APPROVE:+-auto-approve}
}

run_stacks() {
  local action=$1 target=${2:-all} stack list
  list="$(selected "$target")"
  if [[ "$action" == destroy ]]; then
    list="$(echo "$list" | awk '{ l[NR] = $0 } END { for (i = NR; i > 0; i--) print l[i] }')"
  fi
  for stack in $list; do
    echo "==> terraform $action $stack ($ENV)"
    case "$action" in
      plan) AUTO_APPROVE='' tf_run "$stack" "$stack" plan -lock=false ;;
      *) tf_run "$stack" "$stack" "$action" ;;
    esac
  done
}

run_service() {
  local action=$1 service=${2:?Falta el nombre del servicio}
  echo "==> terraform $action service $service ($ENV)"
  case "$action" in
    plan) AUTO_APPROVE='' tf_run service "services/$service" plan -lock=false ;;
    *) tf_run service "services/$service" "$action" ;;
  esac
}

action="${1:-plan}"
case "$action" in
  plan | apply | destroy) ;;
  *)
    echo "Uso: ENV=<dev|staging|prod> $0 <plan|apply|destroy> [all|<stack>|service <servicio>]" >&2
    exit 1
    ;;
esac

if [[ "${2:-}" == service ]]; then
  run_service "$action" "${3:-}"
else
  run_stacks "$action" "${2:-all}"
fi
