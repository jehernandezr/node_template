# shellcheck shell=bash
# Shared functions of the pipeline scripts. They are loaded with source from scripts that
# already enable set -euo pipefail. With DRY_RUN=1 each command is printed with the "+ " prefix
# on stdout instead of running; capture returns "<dry-run>" and shows the command on stderr.

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

# Writes a word in single quotes only if it has characters the shell would interpret.
quote_word() {
  if [[ "$1" =~ ^[A-Za-z0-9_@%+=:,./-]+$ ]]; then
    printf '%s' "$1"
  else
    printf "'%s'" "${1//\'/\'\\\'\'}"
  fi
}

# Prints a "+ command ..." line on stdout without running it.
dry_print() {
  local line="+" word
  for word in "$@"; do
    line+=" $(quote_word "$word")"
  done
  printf '%s\n' "$line"
}

# Prints free text (pipelines, subshells) with the "+ " prefix.
dry_text() {
  printf '+ %s\n' "$1"
}

# Runs the command or, in DRY_RUN, prints it.
run() {
  if is_dry; then
    dry_print "$@"
    return 0
  fi
  "$@"
}

# Returns the command output. In DRY_RUN it shows the command on stderr and returns "<dry-run>".
capture() {
  if is_dry; then
    dry_print "$@" >&2
    printf '%s\n' '<dry-run>'
    return 0
  fi
  "$@"
}

# Checks an existence condition. In DRY_RUN it prints the command and answers that it does not exist,
# so the flow continues to the creation or the upload.
probe() {
  if is_dry; then
    dry_print "$@"
    return 1
  fi
  "$@" >/dev/null 2>&1
}

# Reads a field of a JSON: json_get <json> <expression over o>. Prints the value, or nothing if it is
# null or undefined. Strings come out without quotes and the rest as JSON.
json_get() {
  printf '%s' "$1" | node -e "
    const o = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
    const v = ($2);
    if (v === undefined || v === null) process.exit(0);
    process.stdout.write(typeof v === 'string' ? v : JSON.stringify(v));
  "
}

# Validates a service or environment name before using it in paths and expressions.
require_identifier() {
  local label=$1 value=$2
  if [[ ! "$value" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    log "Invalid $label: $value"
    exit 1
  fi
}

# Writes KEY=value to GITHUB_ENV or, outside Actions, to stdout.
export_value() {
  local key=$1 value=$2
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    printf '%s=%s\n' "$key" "$value" >> "$GITHUB_ENV"
  else
    printf '%s=%s\n' "$key" "$value"
  fi
}
