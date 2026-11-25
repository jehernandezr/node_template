#!/usr/bin/env bash
# Terraform per stack against AWS. The pipeline and people use it, with the same rules.
#   ENV=dev deploy-aws.sh plan    [all|<stack>]       # plan one stack or all of them, in order
#   ENV=dev deploy-aws.sh apply   [all|<stack>]       # applies the saved plan: network, platform, data, messaging, edge
#   ENV=dev deploy-aws.sh destroy [all|<stack>]       # destroy in reverse order
#   ENV=dev deploy-aws.sh plan    service <service>   # stack of one service (its own state)
#   ENV=dev deploy-aws.sh apply   service <service>
# plan saves the plan in PLAN_DIR (by default backend/infra/terraform/.plans/<ENV>) and apply
# applies that file and nothing else: what was reviewed is what is applied. If the state changed
# since the plan, Terraform rejects the old plan and it has to be planned again. A stack that reads
# outputs of another one is planned after that other one is applied.
# Variables: ENV (dev), AUTO_APPROVE=1 skips the destroy confirmation, LOCK_TIMEOUT (5m).
# The artifacts of a service arrive as TF_VAR_image and TF_VAR_lambda_package when planning.
# Credentials: OIDC in CI, a profile locally.
set -euo pipefail

TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"
ENV="${ENV:-dev}"
ORDER=(network platform data messaging edge)
PLAN_DIR="${PLAN_DIR:-$TF_DIR/.plans/$ENV}"
# Waits for the state lock instead of reading a state half written by another apply.
LOCK_TIMEOUT="${LOCK_TIMEOUT:-5m}"

if [[ "$ENV" == "local" ]]; then
  echo "There is no Terraform locally: use backend/infra/scripts/local.sh" >&2
  exit 1
fi

# Stacks of the environment in dependency order.
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

# $1: stack folder (stacks/<x>), $2: values folder (environments/<env>/<y>), $3: action.
tf_run() {
  local code="$TF_DIR/stacks/$1" values="$TF_DIR/environments/$ENV/$2" action=$3
  local plan_file="$PLAN_DIR/${2//\//-}.tfplan"
  if [[ ! -f "$values/terraform.tfvars" ]]; then
    echo "$values/terraform.tfvars does not exist" >&2
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
        echo "No saved plan in $plan_file. Run first: ENV=$ENV $0 plan" >&2
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
  local action=$1 service=${2:?Missing the service name}
  echo "==> terraform $action service $service ($ENV)"
  tf_run service "services/$service" "$action"
}

action="${1:-plan}"
case "$action" in
  plan | apply | destroy) ;;
  *)
    echo "Usage: ENV=<dev|staging|prod> $0 <plan|apply|destroy> [all|<stack>|service <service>]" >&2
    exit 1
    ;;
esac

if [[ "${2:-}" == service ]]; then
  run_service "$action" "${3:-}"
else
  run_stacks "$action" "${2:-all}"
fi
