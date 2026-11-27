region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

service_name = "billing"

# API on Fargate behind the internal ALB. The API process also runs the jobs (period closing and
# delinquency); the workers apply the usage that services send and the membership changes from identity.
api = {
  route_prefixes    = ["/v1/billing"]
  desired_count     = 1
  min_capacity      = 1
  max_capacity      = 2
  spot              = true
  health_check_path = "/health/ready"
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  usage    = { max_capacity = 2 }
  identity = { max_capacity = 2 }
}
