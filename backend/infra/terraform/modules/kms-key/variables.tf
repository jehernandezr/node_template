variable "alias" {
  description = "Key alias, without the alias/ prefix. For example nt-dev-rds."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9/_-]{1,250}$", var.alias)) && !startswith(var.alias, "aws/")
    error_message = "alias uses letters, digits, /, _ and -, and does not start with aws/."
  }
}

variable "description" {
  description = "What the key is used for."
  type        = string
}

variable "log_group_arns" {
  description = "ARN patterns of the log groups that CloudWatch Logs can encrypt with the key (* allowed). Empty gives CloudWatch Logs no access."
  type        = list(string)
  default     = []
}

variable "service_principals" {
  description = "AWS services that use the key for resources in the account: Sid, principals (for example sqs.amazonaws.com) and actions."
  type = list(object({
    sid      = string
    services = list(string)
    actions  = optional(list(string), ["kms:Decrypt", "kms:GenerateDataKey*"])
  }))
  default = []
}

variable "deletion_window_in_days" {
  description = "Waiting period in days before the key is deleted."
  type        = number
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "deletion_window_in_days must be between 7 and 30."
  }
}

variable "tags" {
  description = "Additional tags for the key."
  type        = map(string)
  default     = {}
}
