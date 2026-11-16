#!/usr/bin/env bash
# Despliega un servicio por etapas. Sin etapas corre publish, migrate, plan y apply, en ese orden:
# el artefacto sale antes porque el apply necesita TF_VAR_image o TF_VAR_lambda_package.
# Uso: deploy-service.sh <ambiente> <servicio> [publish|migrate|plan|apply]...
# plan y apply cargan .artifacts/<servicio>.env (lo escribe publish). En DRY_RUN no se exige el
# archivo: se registra "+ source .artifacts/<servicio>.env".
# Variables: las de publish-service.sh, DRY_RUN=1 para imprimir todo sin ejecutar.
# Código de salida 2 para una etapa desconocida.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: deploy-service.sh <ambiente> <servicio> [etapa...]}"
SERVICE="${2:?uso: deploy-service.sh <ambiente> <servicio> [etapa...]}"
shift 2
require_identifier "ambiente" "$ENVIRONMENT"
require_identifier "servicio" "$SERVICE"
export DRY_RUN="${DRY_RUN:-0}"

usage() {
  log "uso: deploy-service.sh <ambiente> <servicio> [publish|migrate|plan|apply]..."
}

if [[ $# -eq 0 ]]; then
  set -- publish migrate plan apply
fi
for stage in "$@"; do
  case "$stage" in
    publish | migrate | plan | apply) ;;
    *)
      log "Etapa desconocida: $stage"
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
    log "No existe $env_file: corre antes la etapa publish de $SERVICE en $ENVIRONMENT"
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
