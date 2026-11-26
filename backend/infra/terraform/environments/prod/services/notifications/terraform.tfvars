region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

service_name = "notifications"

# API on Fargate behind the internal ALB. It also handles the transactional email operation, so it sends
# through SES.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/notifications", "/v1/notification-preferences"]
  listener_rule_priority = 120
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
  spot                   = false
  health_check_path      = "/health/ready"
  ses_send               = true
}

# SSE and Socket.IO behind the public ALB, in the same process as the API (REALTIME_HOST = "service").
realtime = {
  listener_rule_priority = 130
  path_patterns          = ["/v1/notifications/stream", "/socket.io/*"]
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
}

# The workers turn events into notices (which send email) and close connections of revoked sessions.
workers = {
  triggers         = { queue = "notifications-triggers", max_capacity = 2, ses_send = true }
  realtime-control = { queue = "notifications-realtime-control", max_capacity = 2 }
}

# Non-secret values.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# in this environment, for example "{\"identity\":\"http://identity.prod.internal\"}". The internal API of
# every service answers on the same path, so the shared ALB cannot be used to reach identity. The service
# does not start without that URL.
environment_variables = {
  INTERNAL_API_SIGNER                = "hmac"
  NOTIFICATIONS_EMAIL_SENDER         = "ses"
  NOTIFICATIONS_PUSH_SENDER          = "memory"
  NOTIFICATIONS_FROM_ADDRESS         = "no-reply@prod.node-template.dev"
  NOTIFICATIONS_INBOX_RETENTION_DAYS = "90"
  REALTIME_HOST                      = "service"
  REALTIME_TRANSPORTS                = "sse,socketio"
  REALTIME_AUTH                      = "bearer"
  TRUST_PROXY_HOPS                   = "2"
}

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires INTERNAL_API_SHARED_SECRET y NOTIFICATIONS_EMAIL_PEPPER.
secrets = {}

database_access = true
valkey_access   = true
