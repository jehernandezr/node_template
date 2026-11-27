# Example of the base of a service. To deploy one, copy this file to
# environments/<environment>/services/<service>/base/terraform.tfvars and create next to it a
# backend.tfvars with key = "<region>/services/<service>/base/terraform.tfstate". environment, name_prefix and
# domain come from environments/<environment>/common.tfvars. The service stack (stacks/service/example.tfvars)
# runs the same components under the same keys.

region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# Lambda API: it gets a function role. With runtime = "fargate" it gets an execution and a task role instead.
api = {
  runtime = "lambda"
  # files_access = true  # read and write on the files bucket
  # ses_send     = true  # send email through SES
}

# Realtime always runs on Fargate; publish grants it the producer topics and queues of the topology.
# realtime = { publish = false }

# Fargate workers: each consumes only its queue and receives its QUEUE_URL. A service without queues uses one
# worker without queue: workers = { jobs = {} }.
workers = {
  reports = { queue = "identity-reports-commands" }
}

# Lambda consumers of a queue.
# consumers = {
#   events = { queue = "identity-tasks-events" }
# }

# Size of the one-off task (migrate, and for identity signing-keys and seed).
# one_off_task = { cpu = 512, memory = 1024 }

# Non-secret values and secrets (variable name to Secrets Manager ARN, with an optional JSON key). Every
# component and the one-off task receive them.
environment_variables = {}
secrets               = {}

# Topics and queues come from the producers and consumer of topology.json: they are not repeated here. Each
# worker or consumer only consumes its own queue; files and SES are requested per component.
database_access = true
valkey_access   = true
