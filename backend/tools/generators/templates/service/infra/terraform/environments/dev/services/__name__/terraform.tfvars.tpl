region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

service_name = "__name__"

# API on Fargate behind the internal ALB; the same process runs the outbox relay and the jobs. To move it to
# Lambda: runtime = "lambda" (uses lambda.handler) and remove listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/__name__"]
  listener_rule_priority = 900
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

# Non-secret values. INTERNAL_API_BASE_URLS comes from the deployment, with the internal address of identity.
environment_variables = {
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secrets in Secrets Manager (variable name to ARN). The service config requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
