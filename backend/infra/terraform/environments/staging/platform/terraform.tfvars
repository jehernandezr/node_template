region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

# Alarms and costs: a destination is required in staging. The mailbox is not committed: the deploy passes it
# as TF_VAR_alarm_email, and the plan fails without it. Example values (REEMPLAZAR, example.com) are rejected.
# An existing SNS topic can replace it with alarm_topic_arn.
monthly_budget = 400

# realtime_alb_certificate_arn  = "arn:aws:acm:us-east-1:111111111111:certificate/REPLACE"
# files_cors_allowed_origins    = ["https://app.staging.example.com"]
# ses_domain                    = "staging.example.com"
# route53_zone_id               = "ZREPLACE"
# observability_root_user_email = "observability-staging@your-domain"

secret_recovery_window_days = 7
log_retention_days          = 30
