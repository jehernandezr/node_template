region       = "us-east-1"
environment  = "staging"
name_prefix  = "node-template-staging"
state_bucket = "node-template-staging-tfstate"

service_name = "identity"

# API on Fargate behind the internal ALB (requires fargate_api_enabled in platform). To move it to Lambda:
# runtime = "lambda" (uses lambda.handler) and remove listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/auth", "/v1/me", "/v1/tenant", "/v1/tenants", "/v1/invitations", "/v1/sagas"]
  listener_rule_priority = 100
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

# The worker consumes the access projection queue and runs the service jobs.
workers = {
  access-projection = { queue = "identity-access-projection", max_capacity = 2 }
}

# Non-secret values. The domains belong to the environment and are adjusted at deploy time.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of billing
# (tenant signup and user quota), notifications (email and welcome), tasks and reports (account
# deletion) in this environment, for example "{\"billing\":\"http://billing.staging.internal\",
# \"notifications\":\"http://notifications.staging.internal\",\"tasks\":\"http://tasks.staging.internal\",
# \"reports\":\"http://reports.staging.internal\"}" on a single line. If any of those URLs is missing, the service
# does not start.
environment_variables = {
  IDENTITY_REGION     = "us-east-1"
  IDENTITY_AUDIENCES  = "api"
  IDENTITY_MAILER     = "notifications"
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires IDENTITY_SIGNING_KEYS, IDENTITY_EMAIL_PEPPER, IDENTITY_TOKEN_PEPPER, IDENTITY_API_KEY_PEPPER,
# IDENTITY_DEVICE_ID_KEY, IDENTITY_DATA_KEY and INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
