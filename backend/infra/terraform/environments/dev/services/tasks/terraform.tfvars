region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "tasks"

# API on Lambda in dev, so both API runtimes stay in acceptance (ADR 0039). Staging and prod run it on Fargate.
api = {
  route_prefixes = ["/v1/tasks"]
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  jobs = {}
}
