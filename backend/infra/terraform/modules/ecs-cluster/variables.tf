variable "name_prefix" {
  description = "Prefijo para los nombres del clúster y sus recursos. Máximo 22 caracteres."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "container_insights" {
  description = "Modo de Container Insights: enhanced, enabled o disabled. Las métricas RunningTaskCount salen de aquí."
  type        = string
  default     = "enhanced"

  validation {
    condition     = contains(["enhanced", "enabled", "disabled"], var.container_insights)
    error_message = "container_insights debe ser enhanced, enabled o disabled."
  }
}

variable "default_capacity_provider_strategy" {
  description = "Estrategia por defecto de los servicios que no declaran la suya. Cada entrada usa FARGATE o FARGATE_SPOT."
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
    error_message = "capacity_provider debe ser FARGATE o FARGATE_SPOT."
  }

  validation {
    condition     = length(var.default_capacity_provider_strategy) > 0
    error_message = "Declara al menos un capacity provider."
  }
}

variable "exec_log_retention_days" {
  description = "Días de retención de los logs de ECS Exec."
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.exec_log_retention_days)
    error_message = "exec_log_retention_days debe ser un valor de retención válido de CloudWatch Logs."
  }
}

variable "kms_key_arn" {
  description = "Clave KMS existente para los logs de ECS Exec. Si es null, el módulo crea la suya."
  type        = string
  default     = null
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
