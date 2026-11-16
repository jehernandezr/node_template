# shellcheck shell=bash
# Funciones compartidas de los scripts del pipeline. Se cargan con source desde los scripts
# que ya activan set -euo pipefail. Con DRY_RUN=1 cada comando se imprime con el prefijo "+ "
# en stdout en lugar de ejecutarse; capture devuelve "<dry-run>" y muestra el comando en stderr.

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
SCRIPTS_DIR="$REPO_ROOT/backend/infra/scripts"
TF_ROOT="${TF_ROOT:-$REPO_ROOT/backend/infra/terraform}"
export REPO_ROOT SCRIPTS_DIR TF_ROOT

log() {
  printf '%s\n' "$*" >&2
}

is_dry() {
  [[ "${DRY_RUN:-0}" == "1" ]]
}

# Escribe una palabra entre comillas simples solo si tiene caracteres que la shell interpretaría.
quote_word() {
  if [[ "$1" =~ ^[A-Za-z0-9_@%+=:,./-]+$ ]]; then
    printf '%s' "$1"
  else
    printf "'%s'" "${1//\'/\'\\\'\'}"
  fi
}

# Imprime una línea "+ comando ..." en stdout sin ejecutarla.
dry_print() {
  local line="+" word
  for word in "$@"; do
    line+=" $(quote_word "$word")"
  done
  printf '%s\n' "$line"
}

# Imprime texto libre (pipelines, subshells) con el prefijo "+ ".
dry_text() {
  printf '+ %s\n' "$1"
}

# Ejecuta el comando o, en DRY_RUN, lo imprime.
run() {
  if is_dry; then
    dry_print "$@"
    return 0
  fi
  "$@"
}

# Devuelve la salida del comando. En DRY_RUN lo muestra en stderr y devuelve "<dry-run>".
capture() {
  if is_dry; then
    dry_print "$@" >&2
    printf '%s\n' '<dry-run>'
    return 0
  fi
  "$@"
}

# Comprueba una condición de existencia. En DRY_RUN imprime el comando y responde que no existe,
# así el flujo sigue hasta la creación o la subida.
probe() {
  if is_dry; then
    dry_print "$@"
    return 1
  fi
  "$@" >/dev/null 2>&1
}

# Lee un campo de un JSON: json_get <json> <expresión sobre o>. Imprime el valor, o nada si es
# null o undefined. Las cadenas salen sin comillas y el resto como JSON.
json_get() {
  printf '%s' "$1" | node -e "
    const o = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
    const v = ($2);
    if (v === undefined || v === null) process.exit(0);
    process.stdout.write(typeof v === 'string' ? v : JSON.stringify(v));
  "
}

# Valida un nombre de servicio o de ambiente antes de usarlo en rutas y expresiones.
require_identifier() {
  local label=$1 value=$2
  if [[ ! "$value" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    log "$label no válido: $value"
    exit 1
  fi
}

# Escribe KEY=valor en GITHUB_ENV o, fuera de Actions, en stdout.
export_value() {
  local key=$1 value=$2
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    printf '%s=%s\n' "$key" "$value" >> "$GITHUB_ENV"
  else
    printf '%s=%s\n' "$key" "$value"
  fi
}
