region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

# Alarms and costs: a destination is required in prod. Use a real mailbox; example
# values (REEMPLAZAR, example.com) are rejected. The plan fails until one is set.
# alarm_email     = "alarmas@tu-dominio"
# alarm_topic_arn = "arn:aws:sns:us-east-1:222222222222:alarmas"
monthly_budget = 1500

fargate_api_enabled = false

# realtime_alb_certificate_arn  = "arn:aws:acm:us-east-1:222222222222:certificate/REEMPLAZAR"
# files_cors_allowed_origins    = ["https://app.example.com"]
# ses_domain                    = "example.com"
# route53_zone_id               = "ZREEMPLAZAR"
# observability_root_user_email = "observabilidad@tu-dominio"

secret_recovery_window_days = 30
log_retention_days          = 90
