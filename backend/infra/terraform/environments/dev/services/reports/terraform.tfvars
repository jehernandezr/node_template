region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "reports"

# API on Fargate behind the internal ALB. The workers compute the runs that the API queues and keep the
# projections up to date with events from tasks, billing and notifications. To move the API to Lambda:
# runtime = "lambda" (uses lambda.handler) and remove listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/reports"]
  listener_rule_priority = 140
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

workers = {
  runs                = { queue = "reports-runs", max_capacity = 2 }
  projections         = { queue = "reports-projections", max_capacity = 2 }
  finance-projections = { queue = "reports-finance-projections", max_capacity = 2 }
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

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
