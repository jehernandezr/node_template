variable "name_prefix" {
  description = "Name prefix, shared with the cluster, for example nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR. Tasks send TCP egress inside it (EFS) and the internal ALB accepts clients from this range."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the tasks, EFS and the internal ALB, in at least two zones."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets are required."
  }
}

variable "cluster_arn" {
  description = "ECS cluster ARN."
  type        = string
}

variable "create_internal_alb" {
  description = "true creates an internal ALB just for OpenObserve. false uses an existing listener via alb_listener_arn."
  type        = bool
  default     = true
}

variable "internal_alb_certificate_arn" {
  description = "ACM certificate for the internal ALB. If null, the listener is HTTP on port 80 and must only be used inside the VPC."
  type        = string
  default     = null
}

variable "internal_alb_client_cidr_blocks" {
  description = "CIDRs that reach the internal ALB: services that send telemetry and machines that use the UI. Defaults to the VPC."
  type        = list(string)
  default     = []
}

variable "internal_alb_deletion_protection" {
  description = "Protects the internal ALB against deletion."
  type        = bool
  default     = true
}

variable "alb_listener_arn" {
  description = "ARN of the HTTPS listener of an existing ALB. Required with create_internal_alb = false."
  type        = string
  default     = null
}

variable "alb_security_group_id" {
  description = "Security group of the existing ALB. The module adds its egress to OpenObserve. Required with create_internal_alb = false."
  type        = string
  default     = null
}

variable "alb_dns_name" {
  description = "DNS name of the existing ALB. Used for the endpoint when there are no host_headers."
  type        = string
  default     = null
}

variable "listener_rule_priority" {
  description = "Rule priority on the existing listener."
  type        = number
  default     = 50
}

variable "host_headers" {
  description = "Hosts that route to OpenObserve, for example [\"observability.example.com\"]. Required with an existing listener."
  type        = list(string)
  default     = []
}

variable "public_hostname" {
  description = "DNS name clients use to reach OpenObserve, if you point your own record at the ALB. Null uses host_headers or the ALB DNS name."
  type        = string
  default     = null
}

variable "organization" {
  description = "OpenObserve organization in the OTLP ingestion path (/api/<organization>/...)."
  type        = string
  default     = "default"
}

variable "root_user_email" {
  description = "Email of the OpenObserve root user."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.root_user_email))
    error_message = "root_user_email must be a valid email address."
  }
}

variable "image" {
  description = "OpenObserve image. Pin a reviewed version; do not use latest."
  type        = string
  default     = "public.ecr.aws/zinclabs/openobserve:v0.14.7"
}

variable "cpu" {
  description = "Task CPU units."
  type        = number
  default     = 1024

  validation {
    condition     = contains([512, 1024, 2048, 4096], var.cpu)
    error_message = "cpu must be 512, 1024, 2048 or 4096."
  }
}

variable "memory" {
  description = "Task memory in MiB. Must be a valid Fargate combination for cpu."
  type        = number
  default     = 4096
}

variable "cpu_architecture" {
  description = "Task architecture: ARM64 or X86_64."
  type        = string
  default     = "ARM64"

  validation {
    condition     = contains(["ARM64", "X86_64"], var.cpu_architecture)
    error_message = "cpu_architecture must be ARM64 or X86_64."
  }
}

variable "data_retention_days" {
  description = "Days OpenObserve keeps data before compacting and deleting it."
  type        = number
  default     = 30

  validation {
    condition     = var.data_retention_days >= 1
    error_message = "data_retention_days must be at least 1."
  }
}

variable "secret_recovery_window_days" {
  description = "Recovery window in days when the secret is deleted. 0 deletes it immediately."
  type        = number
  default     = 7

  validation {
    condition     = var.secret_recovery_window_days == 0 || (var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30)
    error_message = "secret_recovery_window_days must be 0 or between 7 and 30."
  }
}

variable "log_retention_days" {
  description = "Retention in days for the OpenObserve log group."
  type        = number
  default     = 30
}

variable "storage_force_destroy" {
  description = "Allows deleting the storage bucket even if it has data. Only for disposable environments."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
