# Example of the runtime of a service. To deploy one, copy this file to
# environments/<environment>/services/<service>/terraform.tfvars and create next to it a
# backend.tfvars with key = "<region>/services/<service>/terraform.tfstate". environment, name_prefix and
# domain come from environments/<environment>/common.tfvars. Its components, their runtime, queues and
# permissions come from service-base (stacks/service-base/example.tfvars), which is applied first.
# The pipeline passes the artifacts with TF_VAR_image and TF_VAR_lambda_package.

region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# Lambda API behind API Gateway HTTP, CloudFront and WAF. On Fargate it uses the Fargate fields and the
# listener priority of the service in listener-priorities.json.
api = {
  route_prefixes = ["/identity"]
  memory_size    = 1024
}

# Realtime always runs on Fargate behind the public ALB (realtime_alb_certificate_arn in platform).
# realtime = {
#   path_patterns = ["/identity/socket.io/*", "/identity/events/*"]
# }

# Fargate workers: each keeps one task for the outbox relay and the jobs, and scales on the depth of its
# queue.
workers = {
  reports = { max_capacity = 4 }
}

# Lambda consumers of a queue.
# consumers = {
#   events = { handler = "lambda.sqsHandler" }
# }
