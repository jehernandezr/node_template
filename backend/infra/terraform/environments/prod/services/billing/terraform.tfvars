region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

service_name = "billing"

# API on Fargate behind the internal ALB. The API process also runs the jobs (period closing and
# delinquency); the workers apply the usage that services send and the membership changes from identity.
api = {
  route_prefixes    = ["/v1/billing"]
  desired_count     = 2
  min_capacity      = 2
  max_capacity      = 6
  spot              = false
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  usage    = { max_capacity = 4 }
  identity = { max_capacity = 4 }
}
