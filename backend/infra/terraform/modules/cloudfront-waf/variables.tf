variable "name_prefix" {
  description = "Prefix for the names of the distributions, the web bucket and the WAF."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 that covers web_aliases and api_aliases."
  type        = string

  validation {
    condition     = can(regex("^arn:[^:]+:acm:us-east-1:", var.acm_certificate_arn))
    error_message = "The CloudFront certificate must be in us-east-1."
  }
}

variable "web_aliases" {
  description = "Domains of the Flutter web app, for example app.example.com."
  type        = list(string)
  default     = []
}

variable "web_default_root_object" {
  description = "Object served at the root."
  type        = string
  default     = "index.html"
}

variable "web_force_destroy" {
  description = "Allows deleting the web bucket even if it contains objects."
  type        = bool
  default     = false
}

variable "api_origin_domain_name" {
  description = "Domain of the API origin. It must match a valid certificate on the origin (for example a custom record pointing to the ALB, or the API Gateway endpoint). Null disables the API distribution."
  type        = string
  default     = null
}

variable "api_aliases" {
  description = "API domains, for example api.example.com."
  type        = list(string)
  default     = []
}

variable "api_origin_forward_host_header" {
  description = "true forwards the client Host to the origin (an ALB). false omits it, as required by API Gateway, which is the default origin."
  type        = bool
  default     = false
}

variable "api_origin_read_timeout" {
  description = "Seconds CloudFront waits for the origin response. Between 1 and 180 (more than 60 requires a quota increase)."
  type        = number
  default     = 60

  validation {
    condition     = var.api_origin_read_timeout >= 1 && var.api_origin_read_timeout <= 180
    error_message = "api_origin_read_timeout must be between 1 and 180."
  }
}

variable "api_origin_verify_header_value" {
  description = "Value of the X-Origin-Verify header that CloudFront adds toward the origin, so the origin can reject traffic that did not go through CloudFront. Null does not add it."
  type        = string
  default     = null
  sensitive   = true
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200 or PriceClass_All."
  }
}

variable "content_security_policy" {
  description = "Content-Security-Policy of the responses. Null does not add it: the Flutter web app needs a custom one."
  type        = string
  default     = null
}

variable "hsts_max_age_seconds" {
  description = "Strict-Transport-Security max-age."
  type        = number
  default     = 63072000
}

variable "logging_bucket_domain_name" {
  description = "Domain of an S3 bucket (<name>.s3.amazonaws.com) for CloudFront access logs. It must allow ACLs. Null disables the logs."
  type        = string
  default     = null
}

variable "waf_block_mode" {
  description = "true blocks requests that match a rule. false only counts them, to tune rules before blocking."
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Requests per IP in 5 minutes before blocking, across all traffic."
  type        = number
  default     = 2000

  validation {
    condition     = var.waf_rate_limit >= 10
    error_message = "waf_rate_limit must be at least 10."
  }
}

variable "waf_auth_path_prefix" {
  description = "Prefix of the authentication routes, which get a stricter rate limit against credential stuffing."
  type        = string
  default     = "/auth/"
}

variable "waf_auth_rate_limit" {
  description = "Requests per IP in 5 minutes on waf_auth_path_prefix."
  type        = number
  default     = 100

  validation {
    condition     = var.waf_auth_rate_limit >= 10
    error_message = "waf_auth_rate_limit must be at least 10."
  }
}

variable "waf_logging_enabled" {
  description = "Sends WAF logs to a KMS-encrypted log group in us-east-1."
  type        = bool
  default     = true
}

variable "waf_log_retention_days" {
  description = "Retention days for WAF logs."
  type        = number
  default     = 90
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
