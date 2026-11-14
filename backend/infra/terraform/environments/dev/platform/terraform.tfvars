region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

# Alarmas y costos. Opcionales en dev; el presupuesto necesita un destino de alarmas.
# alarm_email    = "alarmas-dev@tu-dominio"
# monthly_budget = 150

# true si algún servicio corre su API en Fargate (VPC link y ALB interno).
fargate_api_enabled = false

# Tiempo real (Socket.IO y SSE): certificado regional del ALB público.
# realtime_alb_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR"

# Archivos, correo y observabilidad. Sin valor no se crean.
# files_cors_allowed_origins    = ["https://app.dev.example.com"]
# ses_domain                    = "dev.example.com"
# route53_zone_id               = "ZREEMPLAZAR"
# observability_root_user_email = "observabilidad-dev@tu-dominio"

# Dev es desechable: permite borrar buckets, ALB y secretos de inmediato.
force_destroy_buckets       = true
alb_deletion_protection     = false
secret_recovery_window_days = 0
log_retention_days          = 14
