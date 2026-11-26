variable "compute_enabled" {
  description = "Creates the ECS cluster, OpenObserve, the HTTP API and the ALBs, and reads the network stack. false in the local environment: LocalStack only emulates files, email and alarms."
  type        = bool
  default     = true
}

# --- Alarms and costs ------------------------------------------------------------

variable "alarm_email" {
  description = "Email that receives alarms and cost notices. Creates an encrypted SNS topic and the subscription (the recipient must confirm it). In staging and prod this value or alarm_topic_arn is required."
  type        = string
  default     = null

  validation {
    condition = var.alarm_email == null || !contains(["staging", "prod"], var.environment) || (
      !strcontains(upper(var.alarm_email), "REEMPLAZAR") && !endswith(lower(var.alarm_email), "example.com")
    )
    error_message = "In staging and prod alarm_email must be a real mailbox, not an example value (REEMPLAZAR or example.com)."
  }
}

variable "alarm_topic_arn" {
  description = "ARN of an existing SNS topic for alarms and cost notices. Ignored if you set alarm_email."
  type        = string
  default     = null
}

variable "monthly_budget" {
  description = "Monthly budget of the environment in budget_currency. Notifies the alarm topic at 80 % and 100 % actual and at 100 % forecasted. Null creates no budget."
  type        = number
  default     = null
}

variable "budget_currency" {
  description = "Budget currency."
  type        = string
  default     = "USD"
}

variable "budget_cost_filter_tags" {
  description = "Cost allocation tags (activated in Billing) that filter the budget, for example { Environment = \"prod\" }. Empty counts the whole account."
  type        = map(string)
  default     = {}
}

# --- HTTP API and load balancers ------------------------------------------------

variable "fargate_api_enabled" {
  description = "Creates the VPC link and the internal ALB for services whose API runs on Fargate. Not needed if all APIs are Lambda."
  type        = bool
  default     = false
}

variable "api_throttling_burst_limit" {
  description = "Maximum request burst of the HTTP API."
  type        = number
  default     = 500
}

variable "api_throttling_rate_limit" {
  description = "Sustained requests per second of the HTTP API."
  type        = number
  default     = 1000
}

variable "realtime_alb_certificate_arn" {
  description = "Regional ACM certificate of the public realtime ALB (Socket.IO and SSE). Null does not create the ALB."
  type        = string
  default     = null
}

variable "alb_idle_timeout_seconds" {
  description = "Idle timeout of the realtime ALB. Greater than the Socket.IO and SSE ping interval."
  type        = number
  default     = 3600
}

variable "alb_deletion_protection" {
  description = "Deletion protection for the ALBs (realtime, internal API and OpenObserve)."
  type        = bool
  default     = true
}

# --- Observability --------------------------------------------------------------

variable "observability_root_user_email" {
  description = "Email of the OpenObserve root user. Null does not deploy observability and the services do not export telemetry."
  type        = string
  default     = null
}

variable "observability_data_retention_days" {
  description = "Telemetry retention in OpenObserve."
  type        = number
  default     = 30
}

# --- Files and email ---------------------------------------------------------------

variable "files_cors_allowed_origins" {
  description = "CORS origins of the user files bucket, for example https://app.example.com. Without origins the bucket is not created."
  type        = list(string)
  default     = []
}

variable "ses_domain" {
  description = "SES sender domain. Null creates neither SES nor the email events queue (messaging stack)."
  type        = string
  default     = null
}

variable "ses_dmarc_policy" {
  description = "DMARC policy: none, quarantine or reject. Start with none."
  type        = string
  default     = "none"
}

variable "ses_dmarc_report_email" {
  description = "Destination of the DMARC reports (rua)."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route 53 zone for the SES records. Null leaves them uncreated: publish them yourself (ses_dns_records output)."
  type        = string
  default     = null
}

# --- Common ---------------------------------------------------------------------

variable "log_retention_days" {
  description = "Retention in days for the logs of the HTTP API and its authorizer."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Recovery window in days for a deleted secret. 0 deletes it immediately (disposable environments only)."
  type        = number
  default     = 30
}

variable "force_destroy_buckets" {
  description = "Allows deleting buckets with content (ALB logs, files, OpenObserve). Only for disposable environments."
  type        = bool
  default     = false
}
