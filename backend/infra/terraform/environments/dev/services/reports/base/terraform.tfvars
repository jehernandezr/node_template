region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "reports"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate" }

workers = {
  runs                = { queue = "reports-runs" }
  projections         = { queue = "reports-projections" }
  finance-projections = { queue = "reports-finance-projections" }
}

# Non-secret values.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# (access check), tasks and billing (projection backfill) in this environment, for example
# "{\"identity\":\"http://identity.dev.internal\",\"tasks\":\"http://tasks.dev.internal\",
# \"billing\":\"http://billing.dev.internal\"}" on a single line. The internal API of every service
# answers on the same path, so the shared ALB cannot be used to reach them. If any of those URLs is missing,
# the service does not start.
environment_variables = {
  INTERNAL_API_SIGNER      = "hmac"
  REPORTS_MAX_RESULT_BYTES = "1000000"
  REPORTS_RESULT_STORE     = "row"
  REPORTS_RESULT_TTL_DAYS  = "30"
  TRUST_PROXY_HOPS         = "2"
}

# Secrets created outside this stack (variable name to ARN, with an optional JSON key). INTERNAL_API_SHARED_SECRET
# is never created in AWS: internal calls there are signed with SigV4 (ADR 0040, ADR 0041).
secrets = {}

database_access = true
