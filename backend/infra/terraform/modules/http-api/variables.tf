variable "name_prefix" {
  description = "Name prefix for the API and its resources."
  type        = string
}

variable "vpc_link" {
  description = "VPC link to the internal ALB of the APIs running on Fargate. Null if all APIs are Lambda."
  type = object({
    vpc_id     = string
    subnet_ids = list(string)
  })
  default = null
}

variable "origin_verify_enabled" {
  description = "Requires the X-Origin-Verify header added by CloudFront: the API only answers requests that went through CloudFront and its WAF."
  type        = bool
  default     = true
}

variable "origin_verify_secret_version" {
  description = "Origin secret version. Bump it to rotate the secret and, after 5 minutes (the authorizer reload), apply edge so CloudFront sends the new value."
  type        = number
  default     = 1
}

variable "throttling_burst_limit" {
  description = "Maximum request burst for the stage."
  type        = number
  default     = 500
}

variable "throttling_rate_limit" {
  description = "Sustained requests per second for the stage."
  type        = number
  default     = 1000
}

variable "log_retention_days" {
  description = "Retention days for the access logs and the authorizer logs."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Recovery window in days for the origin secret on deletion. 0 deletes it immediately (disposable environments only)."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
