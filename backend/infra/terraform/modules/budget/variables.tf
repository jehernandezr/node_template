variable "name_prefix" {
  description = "Prefix for the budget name."
  type        = string
}

variable "monthly_limit" {
  description = "Monthly limit in the given currency."
  type        = number

  validation {
    condition     = var.monthly_limit > 0
    error_message = "monthly_limit must be greater than zero."
  }
}

variable "currency" {
  description = "Currency of the limit."
  type        = string
  default     = "USD"
}

variable "sns_topic_arn" {
  description = "SNS topic that receives the notifications."
  type        = string
}

variable "notifications" {
  description = "Notifications: percentage of the limit and type (ACTUAL for actual spend, FORECASTED for the monthly forecast)."
  type = list(object({
    threshold_percent = number
    type              = string
  }))
  default = [
    { threshold_percent = 80, type = "ACTUAL" },
    { threshold_percent = 100, type = "ACTUAL" },
    { threshold_percent = 100, type = "FORECASTED" },
  ]

  validation {
    condition     = alltrue([for n in var.notifications : contains(["ACTUAL", "FORECASTED"], n.type)])
    error_message = "Each notification type must be ACTUAL or FORECASTED."
  }
}

variable "cost_filter_tags" {
  description = "Filters cost by cost allocation tags activated in Billing (key to value). Empty covers the whole account."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Additional tags for the budget."
  type        = map(string)
  default     = {}
}
