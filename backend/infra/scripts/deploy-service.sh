#!/usr/bin/env bash
# Deploys a service by stages. Without stages it runs publish, base, migrate, plan and apply, in that order:
# the artifact goes out first because apply needs TF_VAR_image or TF_VAR_lambda_package, and base plans and
# applies service-base (roles, log groups, security groups and one_off_task) before the migration and before
# the service stack, which reads it. Removing a component reverses that order (publish plan apply, then base):
# service-base refuses to drop a component the applied service stack still runs.
# Usage: deploy-service.sh <environment> <service> [publish|base|migrate|plan|apply]...
# plan and apply load .artifacts/<service>.env (publish writes it). In DRY_RUN the file is not
# required: "+ source .artifacts/<service>.env" is logged.
# Variables: those of publish-service.sh, DRY_RUN=1 to print everything without running it.
# Exit code 2 for an unknown stage.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: deploy-service.sh <environment> <service> [stage...]}"
SERVICE="${2:?usage: deploy-service.sh <environment> <service> [stage...]}"
shift 2
require_identifier "environment" "$ENVIRONMENT"
require_identifier "service" "$SERVICE"
export DRY_RUN="${DRY_RUN:-0}"

usage() {
  log "usage: deploy-service.sh <environment> <service> [publish|base|migrate|plan|apply]..."
}

if [[ $# -eq 0 ]]; then
  set -- publish base migrate plan apply
fi
for stage in "$@"; do
  case "$stage" in
    publish | base | migrate | plan | apply) ;;
    *)
      log "Unknown stage: $stage"
      usage
      exit 2
      ;;
  esac
done

needs_artifacts() {
  local entry needs
  entry="$(node "$SCRIPTS_DIR/service-catalog-cli.mjs" entry "$ENVIRONMENT" "$SERVICE")"
  needs="$(json_get "$entry" 'o.needsImage || o.needsPackage')"
  [[ "$needs" == "true" ]]
}

load_artifacts() {
  local env_file="$REPO_ROOT/.artifacts/$SERVICE.env"
  if is_dry; then
    dry_text "source .artifacts/$SERVICE.env"
    return 0
  fi
  if [[ ! -f "$env_file" ]]; then
    log "$env_file does not exist: run the publish stage of $SERVICE in $ENVIRONMENT first"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

for stage in "$@"; do
  case "$stage" in
    publish)
      "$SCRIPTS_DIR/publish-service.sh" "$ENVIRONMENT" "$SERVICE"
      ;;
    base)
      run env "ENV=$ENVIRONMENT" "$SCRIPTS_DIR/deploy-aws.sh" plan service-base "$SERVICE"
      run env "ENV=$ENVIRONMENT" "$SCRIPTS_DIR/deploy-aws.sh" apply service-base "$SERVICE"
      ;;
    migrate)
      "$SCRIPTS_DIR/migrate-service.sh" "$ENVIRONMENT" "$SERVICE"
      ;;
    plan | apply)
      if needs_artifacts; then
        load_artifacts
      fi
      run env "ENV=$ENVIRONMENT" "$SCRIPTS_DIR/deploy-aws.sh" "$stage" service "$SERVICE"
      ;;
  esac
done
