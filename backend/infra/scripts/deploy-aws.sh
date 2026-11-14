#!/usr/bin/env bash
# Terraform por stack contra AWS. Lo usan el pipeline y las personas, con las mismas reglas.
#   ENV=dev deploy-aws.sh plan    [all|<stack>]       # plan de un stack o de todos, en orden
#   ENV=dev deploy-aws.sh apply   [all|<stack>]       # aplica el plan guardado: network, platform, data, messaging, edge
#   ENV=dev deploy-aws.sh destroy [all|<stack>]       # destroy en orden inverso
#   ENV=dev deploy-aws.sh plan    service <servicio>  # stack de un servicio (estado propio)
#   ENV=dev deploy-aws.sh apply   service <servicio>
# plan guarda el plan en PLAN_DIR (por defecto backend/infra/terraform/.plans/<ENV>) y apply
# aplica ese archivo y nada más: lo que se revisó es lo que se aplica. Si el estado cambió
# desde el plan, Terraform rechaza el plan viejo y hay que volver a planear. Un stack que lee
# salidas de otro se planea después de aplicar ese otro.
# Variables: ENV (dev), AUTO_APPROVE=1 omite la confirmación de destroy, LOCK_TIMEOUT (5m).
# Los artefactos de un servicio llegan como TF_VAR_image y TF_VAR_lambda_package al planear.
# Credenciales: OIDC en CI, perfil en local.
set -euo pipefail

TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"
ENV="${ENV:-dev}"
ORDER=(network platform data messaging edge)
PLAN_DIR="${PLAN_DIR:-$TF_DIR/.plans/$ENV}"
# Espera el candado del estado en lugar de leer un estado a medio escribir por otro apply.
LOCK_TIMEOUT="${LOCK_TIMEOUT:-5m}"

if [[ "$ENV" == "local" ]]; then
  echo "En local no hay Terraform: usa backend/infra/scripts/local.sh" >&2
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

# $1: carpeta del stack (stacks/<x>), $2: carpeta de valores (environments/<env>/<y>), $3: acción.
tf_run() {
  local code="$TF_DIR/stacks/$1" values="$TF_DIR/environments/$ENV/$2" action=$3
  local plan_file="$PLAN_DIR/${2//\//-}.tfplan"
  if [[ ! -f "$values/terraform.tfvars" ]]; then
    echo "No existe $values/terraform.tfvars" >&2
    exit 1
  fi
  terraform -chdir="$code" init -input=false -reconfigure -backend-config="$values/backend.tfvars" >/dev/null
  case "$action" in
    plan)
      mkdir -p "$PLAN_DIR"
      terraform -chdir="$code" plan -input=false -lock-timeout="$LOCK_TIMEOUT" \
        -var-file="$values/terraform.tfvars" -out="$plan_file"
      ;;
    apply)
      if [[ ! -f "$plan_file" ]]; then
        echo "No hay plan guardado en $plan_file. Corre primero: ENV=$ENV $0 plan" >&2
        exit 1
      fi
      terraform -chdir="$code" apply -input=false -lock-timeout="$LOCK_TIMEOUT" "$plan_file"
      rm -f "$plan_file"
      ;;
    destroy)
      terraform -chdir="$code" destroy -input=false -lock-timeout="$LOCK_TIMEOUT" \
        -var-file="$values/terraform.tfvars" ${AUTO_APPROVE:+-auto-approve}
      ;;
  esac
}

run_stacks() {
  local action=$1 target=${2:-all} stack list
  list="$(selected "$target")"
  if [[ "$action" == destroy ]]; then
    list="$(echo "$list" | awk '{ l[NR] = $0 } END { for (i = NR; i > 0; i--) print l[i] }')"
  fi
  for stack in $list; do
    echo "==> terraform $action $stack ($ENV)"
    tf_run "$stack" "$stack" "$action"
  done
}

run_service() {
  local action=$1 service=${2:?Falta el nombre del servicio}
  echo "==> terraform $action service $service ($ENV)"
  tf_run service "services/$service" "$action"
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
