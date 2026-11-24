region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

service_name = "__name__"

# API en Fargate detrás del ALB interno; el mismo proceso corre el relay del outbox y los jobs. Para pasarla a
# Lambda: runtime = "lambda" (usa lambda.handler) y quitar listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/__name__"]
  listener_rule_priority = 900
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

# Valores no secretos. INTERNAL_API_BASE_URLS la da el despliegue, con la dirección interna de identity.
environment_variables = {
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN). La config del servicio exige INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
