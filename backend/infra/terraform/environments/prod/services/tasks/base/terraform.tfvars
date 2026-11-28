region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

service_name = "tasks"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate" }

# tasks consumes no queue: one worker without queue runs the outbox relay, the jobs and saga recovery.
workers = {
  jobs = {}
}

# Non-secret values.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# (access check) and of billing (integration route quotas) in this environment, for example
# "{\"identity\":\"http://identity.prod.internal\",\"billing\":\"http://billing.prod.internal\"}". The internal
# API of every service answers on the same path, so the shared ALB cannot be used to reach them. If any of
# those URLs is missing, the service does not start.
environment_variables = {
  INTERNAL_API_SIGNER          = "hmac"
  SEARCH_MODE                  = "text"
  SEARCH_LANGUAGE              = "spanish"
  TASKS_DELETED_RETENTION_DAYS = "30"
  TRUST_PROXY_HOPS             = "2"
}

# Secrets created outside this stack (variable name to ARN, with an optional JSON key).
# INTERNAL_API_SHARED_SECRET has no source in AWS yet: the config requires it while INTERNAL_API_SIGNER is hmac,
# so a deployed service does not start until internal calls are signed with SigV4 (ADR 0040, ADR 0041).
secrets = {}

database_access = true
