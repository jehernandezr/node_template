region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

service_name = "tasks"

# API on Fargate behind the internal ALB. The same process runs the outbox relay and the jobs: tasks does not
# consume queues. To move it to Lambda: runtime = "lambda" (uses lambda.handler), remove listener_rule_priority
# and add a worker for the jobs.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/tasks"]
  listener_rule_priority = 110
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

# Non-secret values.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# (access check) and of billing (integration route quotas) in this environment, for example
# "{\"identity\":\"http://identity.staging.internal\",\"billing\":\"http://billing.staging.internal\"}". The internal
# API of every service answers on the same path, so the shared ALB cannot be used to reach them. If any of
# those URLs is missing, the service does not start.
environment_variables = {
  INTERNAL_API_SIGNER          = "hmac"
  SEARCH_MODE                  = "text"
  SEARCH_LANGUAGE              = "spanish"
  TASKS_DELETED_RETENTION_DAYS = "30"
  TRUST_PROXY_HOPS             = "2"
}

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
