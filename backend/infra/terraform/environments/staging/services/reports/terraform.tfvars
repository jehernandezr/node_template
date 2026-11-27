region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

service_name = "reports"

# API on Fargate behind the internal ALB. The workers compute the runs that the API queues and keep the
# projections up to date with events from tasks, billing and notifications. To move the API to Lambda:
# runtime = "lambda" (uses lambda.handler).
api = {
  route_prefixes    = ["/v1/reports"]
  desired_count     = 1
  min_capacity      = 1
  max_capacity      = 2
  spot              = true
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  runs                = { max_capacity = 2 }
  projections         = { max_capacity = 2 }
  finance-projections = { max_capacity = 2 }
}
