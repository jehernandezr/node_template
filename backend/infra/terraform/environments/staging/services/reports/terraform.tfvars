region       = "us-east-1"
environment  = "staging"
name_prefix  = "node-template-staging"
state_bucket = "node-template-staging-tfstate"

service_name = "reports"

# API en Fargate detrás del ALB interno. Los workers calculan las ejecuciones que la API deja en cola y
# mantienen las proyecciones con los eventos de tasks, billing y notifications. Para pasar la API a Lambda:
# runtime = "lambda" (usa lambda.handler) y quitar listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/reports"]
  listener_rule_priority = 140
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

workers = {
  runs                = { queue = "reports-runs", max_capacity = 2 }
  projections         = { queue = "reports-projections", max_capacity = 2 }
  finance-projections = { queue = "reports-finance-projections", max_capacity = 2 }
}

# Valores no secretos.
# INTERNAL_API_BASE_URLS es obligatoria y la da el despliegue: un JSON con la dirección interna de identity
# (verificación de acceso), tasks y billing (relleno de proyecciones) en este ambiente, por ejemplo
# "{\"identity\":\"http://identity.staging.internal\",\"tasks\":\"http://tasks.staging.internal\",
# \"billing\":\"http://billing.staging.internal\"}" en una sola línea. La API interna de todos los servicios
# responde en el mismo path, así que el ALB compartido no sirve para llegar a ellos. Sin alguna de esas URLs
# el servicio no arranca.
environment_variables = {
  INTERNAL_API_SIGNER      = "hmac"
  REPORTS_MAX_RESULT_BYTES = "1000000"
  REPORTS_RESULT_STORE     = "row"
  REPORTS_RESULT_TTL_DAYS  = "30"
  TRUST_PROXY_HOPS         = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN, con clave JSON opcional). La config del servicio
# exige INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
