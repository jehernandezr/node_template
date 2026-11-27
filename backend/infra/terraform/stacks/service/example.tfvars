# Example of a service. To deploy one, copy this file to
# environments/<environment>/services/<service>/terraform.tfvars and create next to it a
# backend.tfvars with key = "<region>/services/<service>/terraform.tfstate". environment, name_prefix and
# domain come from environments/<environment>/common.tfvars.
# The pipeline passes the artifacts with TF_VAR_image and TF_VAR_lambda_package.

region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# Lambda API behind API Gateway HTTP, CloudFront and WAF. To move it to Fargate:
# runtime = "fargate". The listener priority comes from the position of the service in the catalog.
api = {
  runtime        = "lambda"
  route_prefixes = ["/identity"]
  memory_size    = 1024
  # files_access = true  # read and write on the files bucket
  # ses_send     = true  # send email through SES
}

# Realtime always runs on Fargate behind the public ALB (realtime_alb_certificate_arn in platform).
# realtime = {
#   path_patterns = ["/identity/socket.io/*", "/identity/events/*"]
# }

# Fargate workers: each keeps one task for the outbox relay and the jobs, and scales on the depth of its
# queue. A service without queues uses one worker without queue: workers = { jobs = {} }.
# workers = {
#   reports = { queue = "identity-reports-commands", max_capacity = 4 }
# }

# Lambda consumers of a queue.
# consumers = {
#   events = { queue = "identity-tasks-events", handler = "lambda.sqsHandler" }
# }

# Topics and queues come from the producers and consumer of topology.json: they are not repeated here. Each
# worker or consumer only consumes its own queue; files and SES are requested per component.
database_access = true
valkey_access   = true
