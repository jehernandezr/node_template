region       = "us-east-1"
environment  = "prod"
name_prefix  = "node-template-prod"
state_bucket = "node-template-prod-tfstate"

service_name = "notifications"

# API en Fargate detrás del ALB interno. Atiende además la operación de correo transaccional, así que envía
# por SES.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/notifications", "/v1/notification-preferences"]
  listener_rule_priority = 120
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
  spot                   = false
  health_check_path      = "/health/ready"
  ses_send               = true
}

# SSE y Socket.IO detrás del ALB público, en el mismo proceso que la API (REALTIME_HOST = "service").
realtime = {
  listener_rule_priority = 130
  path_patterns          = ["/v1/notifications/stream", "/socket.io/*"]
  desired_count          = 2
  min_capacity           = 2
  max_capacity           = 6
}

# Los workers convierten eventos en avisos (que envían correo) y cierran conexiones de sesiones revocadas.
workers = {
  triggers         = { queue = "notifications-triggers", max_capacity = 2, ses_send = true }
  realtime-control = { queue = "notifications-realtime-control", max_capacity = 2 }
}

# Valores no secretos.
# INTERNAL_API_BASE_URLS es obligatoria y la da el despliegue: un JSON con la dirección interna de identity
# en este ambiente, por ejemplo "{\"identity\":\"http://identity.prod.internal\"}". La API interna de todos
# los servicios responde en el mismo path, así que el ALB compartido no sirve para llegar a identity. Sin
# esa URL el servicio no arranca.
environment_variables = {
  INTERNAL_API_SIGNER                = "hmac"
  NOTIFICATIONS_EMAIL_SENDER         = "ses"
  NOTIFICATIONS_PUSH_SENDER          = "memory"
  NOTIFICATIONS_FROM_ADDRESS         = "no-reply@prod.node-template.dev"
  NOTIFICATIONS_INBOX_RETENTION_DAYS = "90"
  REALTIME_HOST                      = "service"
  REALTIME_TRANSPORTS                = "sse,socketio"
  REALTIME_AUTH                      = "bearer"
  TRUST_PROXY_HOPS                   = "2"
}

# Secretos en Secrets Manager (nombre de variable a ARN, con clave JSON opcional). La config del servicio
# exige INTERNAL_API_SHARED_SECRET y NOTIFICATIONS_EMAIL_PEPPER.
secrets = {}

database_access = true
valkey_access   = true
