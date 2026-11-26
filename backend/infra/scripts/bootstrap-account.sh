#!/usr/bin/env bash
# Creates the Terraform state bucket of one account, once, before its first global apply
# (docs/runbooks/first-deploy.md). The bucket and region come from
# environments/<environment>/global/backend.tfvars. The bucket is versioned, encrypted with KMS,
# private and TLS-only; Terraform locks the state with S3 native locking (use_lockfile), so no
# DynamoDB table is needed. Running it again changes nothing: an existing bucket of this account is
# kept and its settings are applied again.
# Usage: bootstrap-account.sh <environment>
# Credentials: the account's admin session (AWS_PROFILE). DRY_RUN=1 prints the calls without making them.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?usage: bootstrap-account.sh <environment>}"
require_identifier "environment" "$ENVIRONMENT"
BACKEND="$TF_ROOT/environments/$ENVIRONMENT/global/backend.tfvars"

if [[ ! -f "$BACKEND" ]]; then
  log "$BACKEND does not exist"
  exit 1
fi

# Reads key = "value" from the backend file.
backend_value() {
  sed -n "s/^$1[[:space:]]*=[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "$BACKEND" | head -n 1
}

BUCKET="$(backend_value bucket)"
REGION="$(backend_value region)"
if [[ -z "$BUCKET" || -z "$REGION" ]]; then
  log "$BACKEND must set bucket and region"
  exit 1
fi

ACCOUNT="$(capture aws sts get-caller-identity --query Account --output text)"
log "Account $ACCOUNT, state bucket $BUCKET in $REGION"

if probe aws s3api head-bucket --bucket "$BUCKET" --expected-bucket-owner "$ACCOUNT" --region "$REGION"; then
  log "$BUCKET already exists in this account: applying its settings again"
elif [[ "$REGION" == "us-east-1" ]]; then
  run aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
else
  run aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION"
fi

run aws s3api put-public-access-block --bucket "$BUCKET" --region "$REGION" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

run aws s3api put-bucket-ownership-controls --bucket "$BUCKET" --region "$REGION" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

run aws s3api put-bucket-versioning --bucket "$BUCKET" --region "$REGION" \
  --versioning-configuration Status=Enabled

run aws s3api put-bucket-encryption --bucket "$BUCKET" --region "$REGION" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"},"BucketKeyEnabled":true}]}'

run aws s3api put-bucket-policy --bucket "$BUCKET" --region "$REGION" --policy \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"DenyInsecureTransport\",\"Effect\":\"Deny\",\"Principal\":\"*\",\"Action\":\"s3:*\",\"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"],\"Condition\":{\"Bool\":{\"aws:SecureTransport\":\"false\"}}}]}"

log "State bucket $BUCKET is ready. Next: ENV=$ENVIRONMENT backend/infra/scripts/deploy-aws.sh plan global"
