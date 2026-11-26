region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

# Alarms and costs. Optional in dev; the budget needs an alarm destination.
# alarm_email    = "alarmas-dev@tu-dominio"
# monthly_budget = 150

# Realtime (Socket.IO and SSE): regional certificate for the public ALB.
# realtime_alb_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR"

# Files, email and observability. Not created without a value.
# files_cors_allowed_origins    = ["https://app.dev.example.com"]
# ses_domain                    = "dev.example.com"
# route53_zone_id               = "ZREEMPLAZAR"
# observability_root_user_email = "observabilidad-dev@tu-dominio"

# Dev is disposable: allows deleting buckets, ALB and secrets immediately.
force_destroy_buckets       = true
alb_deletion_protection     = false
secret_recovery_window_days = 0
log_retention_days          = 14
