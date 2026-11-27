region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

service_name = "tasks"

# API on Fargate behind the internal ALB. To move it to Lambda: runtime = "lambda" (uses lambda.handler).
api = {
  route_prefixes    = ["/v1/tasks"]
  desired_count     = 1
  min_capacity      = 1
  max_capacity      = 2
  spot              = true
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  jobs = {}
}
