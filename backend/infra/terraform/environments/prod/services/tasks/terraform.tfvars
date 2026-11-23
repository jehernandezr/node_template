region       = "us-east-1"
environment  = "prod"
name_prefix  = "node-template-prod"
state_bucket = "node-template-prod-tfstate"

service_name = "tasks"

# API en Fargate detrás del ALB interno. El mismo proceso corre el relay del outbox y los jobs: tasks no
# consume colas. Para pasarla a Lambda: runtime = "lambda" (usa lambda.handler), quitar listener_rule_priority
# y agregar un worker para los jobs.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/tasks"]
  listener_rule_priority = 110
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
  spot                   = false
  health_check_path      = "/health/ready"
}

# Valores no secretos.
# INTERNAL_API_BASE_URLS es obligatoria y la da el despliegue: un JSON con la dirección interna de identity
# (verificación de acceso) y de billing (cuotas de las rutas de integración) en este ambiente, por ejemplo
# "{\"identity\":\"http://identity.prod.internal\",\"billing\":\"http://billing.prod.internal\"}". La API
# interna de todos los servicios responde en el mismo path, así que el ALB compartido no sirve para llegar a
# ellos. Sin alguna de esas URLs el servicio no arranca.
environment_variables = {
  INTERNAL_API_SIGNER          = "hmac"
  SEARCH_MODE                  = "text"
  SEARCH_LANGUAGE              = "spanish"
  TASKS_DELETED_RETENTION_DAYS = "30"
  TRUST_PROXY_HOPS             = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN, con clave JSON opcional). La config del servicio
# exige INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
