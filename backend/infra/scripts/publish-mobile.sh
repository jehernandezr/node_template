#!/usr/bin/env bash
# Uploads the built .aab to the artifacts bucket, under the commit tag.
# Usage: publish-mobile.sh <environment>
# Variables: ARTIFACTS_BUCKET, GIT_SHA and AWS_REGION (required). Upload to the stores and
# release signing are not automated here: they need credentials of the account holder.
# DRY_RUN=1 prints the commands and does not require the file.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: publish-mobile.sh <environment>}"
require_identifier "environment" "$ENVIRONMENT"
: "${ARTIFACTS_BUCKET:?missing ARTIFACTS_BUCKET}"
: "${GIT_SHA:?missing GIT_SHA}"
: "${AWS_REGION:?missing AWS_REGION}"
cd "$REPO_ROOT"

aab="$REPO_ROOT/front/apps/mobile/build/app/outputs/bundle/release/app-release.aab"
if ! is_dry && [[ ! -f "$aab" ]]; then
  log "$aab does not exist: run flutter build appbundle --release first"
  exit 1
fi

run aws s3 cp "$aab" "s3://$ARTIFACTS_BUCKET/mobile/$GIT_SHA/app-release.aab" --region "$AWS_REGION"
log "Mobile app of $ENVIRONMENT uploaded to the artifacts bucket"
