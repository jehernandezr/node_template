variable "name_prefix" {
  description = "Prefix for the names of the cluster and its resources. At most 22 characters."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "container_insights" {
  description = "Container Insights mode: enhanced, enabled or disabled. The RunningTaskCount metrics come from here."
  type        = string
  default     = "enhanced"

  validation {
    condition     = contains(["enhanced", "enabled", "disabled"], var.container_insights)
    error_message = "container_insights must be enhanced, enabled or disabled."
  }
}

variable "default_capacity_provider_strategy" {
  description = "Default strategy for services that do not declare their own. Each entry uses FARGATE or FARGATE_SPOT."
  type = list(object({
    capacity_provider = string
    weight            = number
    base              = optional(number, 0)
  }))
  default = [
    { capacity_provider = "FARGATE", weight = 1, base = 1 },
  ]

  validation {
    condition     = alltrue([for s in var.default_capacity_provider_strategy : contains(["FARGATE", "FARGATE_SPOT"], s.capacity_provider)])
    error_message = "capacity_provider must be FARGATE or FARGATE_SPOT."
  }

  validation {
    condition     = length(var.default_capacity_provider_strategy) > 0
    error_message = "Declare at least one capacity provider."
  }
}

variable "exec_log_retention_days" {
  description = "Retention in days for the ECS Exec logs."
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.exec_log_retention_days)
    error_message = "exec_log_retention_days must be a valid CloudWatch Logs retention value."
  }
}

variable "kms_key_arn" {
  description = "Existing KMS key for the ECS Exec logs. If null, the module creates its own."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
