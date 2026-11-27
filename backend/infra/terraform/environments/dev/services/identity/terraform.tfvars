region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# API on Fargate behind the internal ALB. To move it to Lambda:
# runtime = "lambda" (uses lambda.handler).
api = {
  route_prefixes    = ["/v1/auth", "/v1/me", "/v1/tenant", "/v1/tenants", "/v1/invitations", "/v1/sagas"]
  desired_count     = 1
  min_capacity      = 1
  max_capacity      = 2
  spot              = true
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  access-projection = { max_capacity = 2 }
  auth-state        = { max_capacity = 2 }
  billing           = { max_capacity = 2 }
  password-resets   = { max_capacity = 2 }
}
