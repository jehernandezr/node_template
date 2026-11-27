variable "name_prefix" {
  description = "Name prefix shared with the cluster, for example nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "name" {
  description = "Component name, for example billing-api or identity-auth-state. With a name_prefix of up to 22 characters, 31 keeps <name_prefix>-<name>-execution within the 64 characters of an IAM role name."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,29}[a-z0-9]$", var.name))
    error_message = "name must use lowercase letters, digits and hyphens, and be 3 to 31 characters long."
  }
}

variable "runtime" {
  description = "Where the component runs: fargate (an ECS task with execution and task roles) or lambda (a function role)."
  type        = string

  validation {
    condition     = contains(["fargate", "lambda"], var.runtime)
    error_message = "runtime must be fargate or lambda."
  }
}

variable "vpc_id" {
  description = "VPC of the security group."
  type        = string
}

variable "secret_arns" {
  description = "Secrets Manager ARNs the component reads: the execution role of a Fargate task (valueFrom) or the function role of a Lambda (read at startup). A JSON key suffix is accepted and ignored."
  type        = list(string)
  default     = []
}

variable "secrets_kms_key_arns" {
  description = "CMKs that encrypt those secrets."
  type        = list(string)
  default     = []
}

variable "task_policies" {
  description = "Inline IAM policies (name to JSON) of the task role or the function role."
  type        = map(string)
  default     = {}
}

variable "enable_execute_command" {
  description = "Grants the task role the ECS Exec channels. Fargate only."
  type        = bool
  default     = false
}

variable "exec_kms_key_arn" {
  description = "Cluster CMK that encrypts the ECS Exec sessions. Null allows any key of the account."
  type        = string
  default     = null
}

variable "exec_log_group_arn" {
  description = "Log group of the ECS Exec sessions. Null allows the /ecs/* log groups."
  type        = string
  default     = null
}

variable "tracing_mode" {
  description = "X-Ray tracing of the function: Active grants the function role the X-Ray writes. Lambda only."
  type        = string
  default     = "Active"
}

variable "log_retention_days" {
  description = "Retention in days of the component logs."
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "CMK of the logs (and, on Lambda, of the environment variables and the async DLQ). Null creates one for the component."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags for every resource."
  type        = map(string)
  default     = {}
}
