region       = "us-east-1"
environment  = "staging"
name_prefix  = "node-template-staging"
state_bucket = "node-template-staging-tfstate"

# Alarmas y costos: en staging es obligatorio un destino. Usa un buzón real; los valores de
# ejemplo (REEMPLAZAR, example.com) se rechazan.
# alarm_email     = "alarmas-staging@tu-dominio"
# alarm_topic_arn = "arn:aws:sns:us-east-1:111111111111:alarmas"
monthly_budget = 400

fargate_api_enabled = false

# realtime_alb_certificate_arn  = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR"
# files_cors_allowed_origins    = ["https://app.staging.example.com"]
# ses_domain                    = "staging.example.com"
# route53_zone_id               = "ZREEMPLAZAR"
# observability_root_user_email = "observabilidad-staging@tu-dominio"

secret_recovery_window_days = 7
log_retention_days          = 30
