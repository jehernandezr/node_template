variable "name_prefix" {
  description = "Prefix for the names of the load balancer and its resources. Maximum 22 characters."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "name" {
  description = "Load balancer suffix, to have several in the same root (for example alb and api). Maximum 9 characters."
  type        = string
  default     = "alb"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,8}$", var.name))
    error_message = "name uses lowercase letters, digits and hyphens, starts with a letter and has up to 9 characters."
  }
}

variable "internal" {
  description = "true creates an internal ALB, reachable only inside the VPC (for example behind the API Gateway VPC link)."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "ID of the load balancer VPC."
  type        = string
}

variable "subnet_ids" {
  description = "Load balancer subnets, in at least two zones: public if internet-facing, private if internal."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "An ALB needs at least two subnets."
  }
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for the HTTPS listener, in the load balancer region. Null only on an internal ALB: it listens on HTTP inside the VPC."
  type        = string
  default     = null
}

variable "additional_certificate_arns" {
  description = "Additional ACM certificates for the HTTPS listener (SNI)."
  type        = list(string)
  default     = []
}

variable "ssl_policy" {
  description = "TLS policy of the HTTPS listener."
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-Res-2021-06"
}

variable "idle_timeout_seconds" {
  description = "Connection idle timeout. Socket.IO and SSE keep long-lived connections, so the default is high. Between 1 and 4000."
  type        = number
  default     = 3600

  validation {
    condition     = var.idle_timeout_seconds >= 1 && var.idle_timeout_seconds <= 4000
    error_message = "idle_timeout_seconds must be between 1 and 4000."
  }
}

variable "ingress_cidr_blocks" {
  description = "IPv4 CIDRs that can reach the load balancer on 80 and 443. Use ingress_prefix_list_ids to limit it to CloudFront."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ingress_ipv6_cidr_blocks" {
  description = "IPv6 CIDRs that can reach the load balancer on 80 and 443."
  type        = list(string)
  default     = ["::/0"]
}

variable "ingress_prefix_list_ids" {
  description = "Prefix lists that can reach the load balancer, for example the managed com.amazonaws.global.cloudfront.origin-facing."
  type        = list(string)
  default     = []
}

variable "ingress_security_group_ids" {
  description = "Security groups that can reach the listener, for example the one of the API Gateway VPC link."
  type        = list(string)
  default     = []
}

variable "deletion_protection" {
  description = "Protects the load balancer against deletion. Disable it only in disposable environments."
  type        = bool
  default     = true
}

variable "drop_invalid_header_fields" {
  description = "Drops invalid HTTP headers before forwarding."
  type        = bool
  default     = true
}

variable "access_logs_retention_days" {
  description = "Days access logs are kept in S3."
  type        = number
  default     = 90

  validation {
    condition     = var.access_logs_retention_days >= 1
    error_message = "access_logs_retention_days must be at least 1."
  }
}

variable "access_logs_force_destroy" {
  description = "Allows deleting the access logs bucket even if it contains objects."
  type        = bool
  default     = false
}

variable "target_groups" {
  description = "Target groups without sticky sessions, by key. service-fargate services create their own; use this for shared targets. default_target_group_key chooses the one that serves traffic with no matching rule."
  type = map(object({
    port                      = number
    protocol                  = optional(string, "HTTP")
    target_type               = optional(string, "ip")
    health_check_path         = optional(string, "/health")
    health_check_matcher      = optional(string, "200-399")
    deregistration_delay      = optional(number, 30)
    slow_start                = optional(number, 0)
    load_balancing_cross_zone = optional(string, "use_load_balancer_configuration")
  }))
  default = {}
}

variable "default_target_group_key" {
  description = "Key of target_groups that receives traffic with no matching rule. If null, the listener responds 404."
  type        = string
  default     = null

  validation {
    condition     = var.default_target_group_key == null || contains(keys(var.target_groups), coalesce(var.default_target_group_key, "-"))
    error_message = "default_target_group_key must exist in target_groups."
  }
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
