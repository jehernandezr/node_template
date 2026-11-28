region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate" }

# One worker per contract queue: each polls only the queue of its QUEUE_URL.
workers = {
  access-projection = { queue = "identity-access-projection" }
  auth-state        = { queue = "identity-auth-state" }
  billing           = { queue = "identity-billing" }
  password-resets   = { queue = "identity-password-resets" }
}

# Non-secret values. The domains belong to the environment and are adjusted at deploy time.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of billing
# (tenant signup and user quota), notifications (email and welcome), tasks and reports (account
# deletion) in this environment, for example "{\"billing\":\"http://billing.dev.internal\",
# \"notifications\":\"http://notifications.dev.internal\",\"tasks\":\"http://tasks.dev.internal\",
# \"reports\":\"http://reports.dev.internal\"}" on a single line. If any of those URLs is missing, the service
# does not start.
environment_variables = {
  IDENTITY_AUDIENCES  = "api"
  IDENTITY_MAILER     = "notifications"
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secrets this stack generates once, without their values reaching the state (ADR 0041). It also creates the
# IDENTITY_SIGNING_KEYS container, which the signing-keys task fills, and, outside prod, the SMOKE_ACCOUNT one.
# INTERNAL_API_SHARED_SECRET is never created in AWS: internal calls there are signed with SigV4 (ADR 0040).
generated_secrets = [
  "IDENTITY_EMAIL_PEPPER",
  "IDENTITY_TOKEN_PEPPER",
  "IDENTITY_API_KEY_PEPPER",
  "IDENTITY_DEVICE_ID_KEY",
  "IDENTITY_DATA_KEY",
]

# Secrets created outside this stack (variable name to ARN, with an optional JSON key).
secrets = {}

database_access = true
