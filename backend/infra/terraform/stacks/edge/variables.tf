variable "cloudfront_certificate_arn" {
  description = "ACM certificate in us-east-1 covering web_aliases and api_aliases. Null creates neither CloudFront nor WAF."
  type        = string
  default     = null
}

variable "web_aliases" {
  description = "Domains of the Flutter web distribution."
  type        = list(string)
  default     = []
}

variable "api_aliases" {
  description = "Domains of the API distribution."
  type        = list(string)
  default     = []
}

variable "realtime_hostname" {
  description = "DNS name of the realtime ALB. It must be covered by its certificate. With route53_zone_id the record is created."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route 53 zone for the CloudFront and realtime ALB records. Null leaves them uncreated."
  type        = string
  default     = null
}

variable "waf_block_mode" {
  description = "false makes the WAF only count: use it to tune rules before blocking."
  type        = bool
  default     = true
}

variable "content_security_policy" {
  description = "CSP of the Flutter web app. Null does not send it."
  type        = string
  default     = null
}

variable "force_destroy_buckets" {
  description = "Allows deleting the web bucket with content. Only for disposable environments."
  type        = bool
  default     = false
}
