# Ejemplo de un servicio. Para desplegar uno, copia este archivo a
# environments/<ambiente>/services/<servicio>/terraform.tfvars y crea a su lado un
# backend.tfvars con key = "<región>/services/<servicio>/terraform.tfstate".
# El pipeline pasa los artefactos con TF_VAR_image y TF_VAR_lambda_package.

region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

service_name = "identity"

# API en Lambda detrás de API Gateway HTTP, CloudFront y WAF. Para pasarla a Fargate:
# runtime = "fargate", listener_rule_priority único y fargate_api_enabled en platform.
api = {
  runtime        = "lambda"
  route_prefixes = ["/identity"]
  memory_size    = 1024
}

# Tiempo real siempre en Fargate tras el ALB público (realtime_alb_certificate_arn en platform).
# realtime = {
#   listener_rule_priority = 100
#   path_patterns          = ["/identity/socket.io/*", "/identity/events/*"]
# }

# Workers Fargate que escalan desde cero por la profundidad de su cola.
# workers = {
#   reports = { queue = "identity-reports-commands", max_capacity = 4 }
# }

# Consumidores Lambda de una cola.
# consumers = {
#   events = { queue = "identity-tasks-events", handler = "lambda.sqsHandler" }
# }

# Tópicos y colas salen de producers y consumer de topology.json: no se repiten aquí.
database_access = true
valkey_access   = true
files_access    = false
ses_send        = false
