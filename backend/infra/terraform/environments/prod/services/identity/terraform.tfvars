region       = "us-east-1"
environment  = "prod"
name_prefix  = "node-template-prod"
state_bucket = "node-template-prod-tfstate"

service_name = "identity"

# API en Fargate detrás del ALB interno (requiere fargate_api_enabled en platform). Para pasarla a Lambda:
# runtime = "lambda" (usa lambda.handler) y quitar listener_rule_priority.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/auth", "/v1/me", "/v1/tenant", "/v1/tenants", "/v1/invitations", "/v1/sagas"]
  listener_rule_priority = 100
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
  spot                   = false
  health_check_path      = "/health/ready"
}

# El worker consume la cola de la proyección de acceso y corre los jobs del servicio.
workers = {
  access-projection = { queue = "identity-access-projection", max_capacity = 2 }
}

# Valores no secretos. Los dominios son los del ambiente y se ajustan al desplegar.
# INTERNAL_API_BASE_URLS es obligatoria y la da el despliegue: un JSON con la dirección interna de billing
# (alta del tenant y cuota de usuarios), notifications (correo y bienvenida), tasks y reports (borrado de
# cuenta) en este ambiente, por ejemplo "{\"billing\":\"http://billing.prod.internal\",
# \"notifications\":\"http://notifications.prod.internal\",\"tasks\":\"http://tasks.prod.internal\",
# \"reports\":\"http://reports.prod.internal\"}" en una sola línea. Sin alguna de esas URLs el servicio no
# arranca.
environment_variables = {
  IDENTITY_REGION     = "us-east-1"
  IDENTITY_AUDIENCES  = "api"
  IDENTITY_MAILER     = "notifications"
  INTERNAL_API_SIGNER = "hmac"
  TRUST_PROXY_HOPS    = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN, con clave JSON opcional). La config del servicio
# exige IDENTITY_SIGNING_KEYS, IDENTITY_EMAIL_PEPPER, IDENTITY_TOKEN_PEPPER, IDENTITY_API_KEY_PEPPER,
# IDENTITY_DEVICE_ID_KEY, IDENTITY_DATA_KEY e INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
