region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

service_name = "billing"

# API en Fargate detrás del ALB interno. El proceso de la API corre también los jobs (cierre de periodos y
# morosidad); los workers aplican el uso que envían los servicios y los cambios de membresía de identity.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/billing"]
  listener_rule_priority = 150
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

workers = {
  usage    = { queue = "billing-usage", max_capacity = 2 }
  identity = { queue = "billing-identity", max_capacity = 2 }
}

# Valores no secretos. Los días de prueba y de gracia son una decisión comercial: el servicio no arranca sin
# ellos y estos son los de la plantilla.
# INTERNAL_API_BASE_URLS es obligatoria y la da el despliegue: un JSON con la dirección interna de identity
# (verificación de acceso) en este ambiente, por ejemplo "{\"identity\":\"http://identity.dev.internal\"}".
# La API interna de todos los servicios responde en el mismo path, así que el ALB compartido no sirve para
# llegar a identity. Sin esa URL el servicio no arranca.
environment_variables = {
  INTERNAL_API_SIGNER          = "hmac"
  BILLING_TRIAL_DAYS           = "14"
  BILLING_GRACE_DAYS           = "7"
  BILLING_INVOICE_SERIES       = "FAC"
  BILLING_TRIAL_PLAN           = "inicio"
  BILLING_PAYMENT_PROVIDER     = "fake"
  BILLING_FAKE_PAYMENT_OUTCOME = "approved"
  TRUST_PROXY_HOPS             = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN, con clave JSON opcional). La config del servicio
# exige INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
