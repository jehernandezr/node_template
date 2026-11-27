region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "order_history"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate" }

# One worker for the outbox relay, the jobs and saga recovery. Give it the queue of the contract once the
# service consumes one: jobs = { queue = "order-history-<queue>" }.
workers = {
  jobs = {}
}

# Non-secret values. The deployment provides INTERNAL_API_BASE_URLS, with the internal address of identity.
environment_variables = {
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secrets in Secrets Manager (variable name to ARN). The service config requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
