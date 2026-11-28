region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "notifications"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate", ses_send = true }

# Realtime runs on Fargate; it neither publishes nor consumes.
realtime = {}

# The workers turn events into notices (which send email) and close connections of revoked sessions.
workers = {
  triggers         = { queue = "notifications-triggers", ses_send = true }
  realtime-control = { queue = "notifications-realtime-control" }
}

# Non-secret values.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# in this environment, for example "{\"identity\":\"http://identity.dev.internal\"}". The internal API of
# every service answers on the same path, so the shared ALB cannot be used to reach identity. The service
# does not start without that URL.
environment_variables = {
  INTERNAL_API_SIGNER                = "hmac"
  NOTIFICATIONS_EMAIL_SENDER         = "ses"
  NOTIFICATIONS_PUSH_SENDER          = "memory"
  NOTIFICATIONS_FROM_ADDRESS         = "no-reply@dev.node-template.dev"
  NOTIFICATIONS_INBOX_RETENTION_DAYS = "90"
  REALTIME_HOST                      = "service"
  REALTIME_TRANSPORTS                = "sse,socketio"
  REALTIME_AUTH                      = "bearer"
  TRUST_PROXY_HOPS                   = "2"
}

# Secrets this stack generates once, without their values reaching the state (ADR 0041).
# INTERNAL_API_SHARED_SECRET has no source in AWS yet: the config requires it while INTERNAL_API_SIGNER is hmac,
# so a deployed service does not start until internal calls are signed with SigV4 (ADR 0040).
generated_secrets = ["NOTIFICATIONS_EMAIL_PEPPER"]

# Secrets created outside this stack (variable name to ARN, with an optional JSON key).
secrets = {}

database_access = true
