variable "alias" {
  description = "Alias de la clave, sin el prefijo alias/. Por ejemplo nt-dev-rds."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9/_-]{1,250}$", var.alias)) && !startswith(var.alias, "aws/")
    error_message = "alias usa letras, números, /, _ y -, y no empieza por aws/."
  }
}

variable "description" {
  description = "Para qué se usa la clave."
  type        = string
}

variable "log_group_arns" {
  description = "Patrones ARN de los log groups que CloudWatch Logs puede cifrar con la clave (admiten *). Vacío no da acceso a CloudWatch Logs."
  type        = list(string)
  default     = []
}

variable "service_principals" {
  description = "Servicios de AWS que usan la clave para recursos de la cuenta: Sid, principales (por ejemplo sqs.amazonaws.com) y acciones."
  type = list(object({
    sid      = string
    services = list(string)
    actions  = optional(list(string), ["kms:Decrypt", "kms:GenerateDataKey*"])
  }))
  default = []
}

variable "deletion_window_in_days" {
  description = "Días de espera antes de borrar la clave."
  type        = number
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "deletion_window_in_days debe estar entre 7 y 30."
  }
}

variable "tags" {
  description = "Etiquetas adicionales de la clave."
  type        = map(string)
  default     = {}
}
