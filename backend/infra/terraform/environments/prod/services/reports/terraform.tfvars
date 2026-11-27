region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

service_name = "reports"

# API on Fargate behind the internal ALB. The workers compute the runs that the API queues and keep the
# projections up to date with events from tasks, billing and notifications. To move the API to Lambda:
# runtime = "lambda" (uses lambda.handler).
api = {
  route_prefixes    = ["/v1/reports"]
  desired_count     = 2
  min_capacity      = 2
  max_capacity      = 6
  spot              = false
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  runs                = { max_capacity = 4 }
  projections         = { max_capacity = 4 }
  finance-projections = { max_capacity = 4 }
}
