#!/usr/bin/env bash
# Base LocalStack resources for local development.
# LocalStack runs this script once it is ready (ready.d).
set -euo pipefail

BUCKET="platform-files-local"
TOPOLOGY="/etc/localstack/topology.json"
PREFIX="${MESSAGING_NAME_PREFIX:-local}"

if awslocal s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "[init-aws] The bucket ${BUCKET} already exists"
else
  awslocal s3 mb "s3://${BUCKET}"
  echo "[init-aws] Bucket ${BUCKET} created"
fi

# Topics, queues, DLQs and subscriptions from the topology committed to git
# (backend/infra/terraform/topology.json), with the same names and filters as AWS.
# The LocalStack interpreter already ships boto3.
PYTHON="/opt/code/localstack/.venv/bin/python"
if [[ ! -x "${PYTHON}" ]]; then
  PYTHON="python3"
fi

if [[ -f "${TOPOLOGY}" ]]; then
  "${PYTHON}" /etc/localstack/topology.py "${TOPOLOGY}" "${PREFIX}"
  echo "[init-aws] Topology applied with the prefix ${PREFIX}"
else
  echo "[init-aws] ${TOPOLOGY} not found: no queues or topics are created" >&2
fi
