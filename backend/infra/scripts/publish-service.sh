#!/usr/bin/env bash
# Publica el artefacto de un servicio: imagen en ECR (Fargate, workers, tiempo real) y/o paquete
# en S3 (Lambda, consumidores). Escribe .artifacts/<servicio>.env con TF_VAR_image y
# TF_VAR_lambda_package para que el stack service los use al planear.
# Uso: publish-service.sh <ambiente> <servicio>
# Variables: ARTIFACTS_BUCKET, ECR_PREFIX, AWS_REGION (obligatorias), GIT_SHA (por defecto HEAD).
# DRY_RUN=1 imprime los comandos y no escribe .artifacts.
set -euo pipefail

# shellcheck source=pipeline-common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pipeline-common.sh"

ENVIRONMENT="${1:?uso: publish-service.sh <ambiente> <servicio>}"
SERVICE="${2:?uso: publish-service.sh <ambiente> <servicio>}"
require_identifier "ambiente" "$ENVIRONMENT"
require_identifier "servicio" "$SERVICE"
: "${ARTIFACTS_BUCKET:?falta ARTIFACTS_BUCKET}"
: "${ECR_PREFIX:?falta ECR_PREFIX}"
: "${AWS_REGION:?falta AWS_REGION}"
cd "$REPO_ROOT"
GIT_SHA="${GIT_SHA:-$(git rev-parse HEAD)}"

entry="$(node "$SCRIPTS_DIR/service-catalog-cli.mjs" entry "$ENVIRONMENT" "$SERVICE")"
needs_image="$(json_get "$entry" 'o.needsImage')"
needs_package="$(json_get "$entry" 'o.needsPackage')"

run pnpm nx run "$SERVICE:build"

artifacts_dir="$REPO_ROOT/.artifacts"
env_lines=()

if [[ "$needs_image" == "true" ]]; then
  account="$(capture aws sts get-caller-identity --query Account --output text)"
  registry="$account.dkr.ecr.$AWS_REGION.amazonaws.com"
  repo="$ECR_PREFIX/$SERVICE"
  tag="sha-$GIT_SHA"

  if ! probe aws ecr describe-repositories --repository-names "$repo"; then
    run aws ecr create-repository --repository-name "$repo" \
      --image-tag-mutability IMMUTABLE --image-scanning-configuration scanOnPush=true
  fi

  if is_dry; then
    dry_text "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $registry"
  else
    aws ecr get-login-password --region "$AWS_REGION" |
      docker login --username AWS --password-stdin "$registry"
  fi

  if ! probe aws ecr describe-images --repository-name "$repo" --image-ids "imageTag=$tag"; then
    node_version="$(tr -d '[:space:]' < "$REPO_ROOT/.nvmrc")"
    run docker build -f backend/infra/scripts/service.Dockerfile \
      --build-arg "SERVICE=$SERVICE" --build-arg "NODE_VERSION=$node_version" \
      -t "$registry/$repo:$tag" .
    run docker push "$registry/$repo:$tag"
  fi

  digest="$(capture aws ecr describe-images --repository-name "$repo" \
    --image-ids "imageTag=$tag" --query 'imageDetails[0].imageDigest' --output text)"
  env_lines+=("TF_VAR_image=$registry/$repo@$digest")
fi

if [[ "$needs_package" == "true" ]]; then
  dist="$REPO_ROOT/backend/dist/$SERVICE"
  zip_file="$artifacts_dir/$SERVICE-$GIT_SHA.zip"
  key="services/$SERVICE/$GIT_SHA.zip"

  if is_dry; then
    dry_text "cd $dist && zip -qr $zip_file ."
  else
    mkdir -p "$artifacts_dir"
    (cd "$dist" && zip -qr "$zip_file" .)
  fi
  run aws s3 cp "$zip_file" "s3://$ARTIFACTS_BUCKET/$key"
  version="$(capture aws s3api head-object --bucket "$ARTIFACTS_BUCKET" --key "$key" \
    --query VersionId --output text)"

  if is_dry; then
    dry_text "TF_VAR_lambda_package con s3://$ARTIFACTS_BUCKET/$key"
  else
    package_json="$(node -e 'process.stdout.write(JSON.stringify({
      s3_bucket: process.argv[1], s3_key: process.argv[2], s3_object_version: process.argv[3]
    }))' "$ARTIFACTS_BUCKET" "$key" "$version")"
    env_lines+=("TF_VAR_lambda_package=$package_json")
  fi
fi

if ! is_dry; then
  mkdir -p "$artifacts_dir"
  env_file="$artifacts_dir/$SERVICE.env"
  : > "$env_file"
  for line in "${env_lines[@]+"${env_lines[@]}"}"; do
    printf '%s\n' "$line" >> "$env_file"
  done
  log "Artefactos de $SERVICE escritos en $env_file"
else
  dry_text "escribir .artifacts/$SERVICE.env"
fi
