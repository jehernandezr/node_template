#!/usr/bin/env bash
# Uploads the built web app to the environment web bucket and invalidates CloudFront.
# Usage: publish-web.sh <environment>
# Variables: NAME_PREFIX and AWS_REGION (required). Requires flutter build web to have run
# in front/apps/web. Bootstrap files and manifests go with no-cache; the rest,
# immutable. If CloudFront has no distribution for the bucket, it ends without invalidating.
# DRY_RUN=1 prints the commands.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: publish-web.sh <environment>}"
require_identifier "environment" "$ENVIRONMENT"
: "${NAME_PREFIX:?missing NAME_PREFIX}"
: "${AWS_REGION:?missing AWS_REGION}"
cd "$REPO_ROOT"

web_dir="$REPO_ROOT/front/apps/web/build/web"
if ! is_dry && [[ ! -d "$web_dir" ]]; then
  log "$web_dir does not exist: run flutter build web --release first"
  exit 1
fi

account="$(capture aws sts get-caller-identity --query Account --output text)"
bucket="$NAME_PREFIX-web-$account"
log "Publishing the $ENVIRONMENT web app to s3://$bucket"

run aws s3 sync "$web_dir" "s3://$bucket" --delete \
  --cache-control 'public,max-age=31536000,immutable' \
  --exclude index.html \
  --exclude flutter_service_worker.js \
  --exclude version.json \
  --exclude 'assets/AssetManifest*' \
  --exclude 'assets/FontManifest.json'

run aws s3 sync "$web_dir" "s3://$bucket" \
  --exclude '*' \
  --include index.html \
  --include flutter_service_worker.js \
  --include version.json \
  --include 'assets/AssetManifest*' \
  --include 'assets/FontManifest.json' \
  --cache-control 'no-cache'

distribution="$(capture aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[].DomainName, '$bucket.s3.$AWS_REGION.amazonaws.com')].Id | [0]" \
  --output text)"

if [[ -z "$distribution" || "$distribution" == "None" ]]; then
  log "No CloudFront distribution points to $bucket: nothing to invalidate"
  exit 0
fi

run aws cloudfront create-invalidation --distribution-id "$distribution" --paths '/*'
