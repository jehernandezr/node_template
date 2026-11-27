region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "__name__"

# API on Fargate behind the internal ALB, with the listener priority of the service in
# listener-priorities.json. Its runtime is set in base/terraform.tfvars.
api = {
  route_prefixes    = ["/v1/__name__"]
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
