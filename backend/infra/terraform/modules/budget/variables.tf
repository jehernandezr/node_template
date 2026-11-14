variable "name_prefix" {
  description = "Prefijo del nombre del presupuesto."
  type        = string
}

variable "monthly_limit" {
  description = "Límite mensual en la moneda indicada."
  type        = number

  validation {
    condition     = var.monthly_limit > 0
    error_message = "monthly_limit debe ser mayor que cero."
  }
}

variable "currency" {
  description = "Moneda del límite."
  type        = string
  default     = "USD"
}

variable "sns_topic_arn" {
  description = "Tópico SNS que recibe los avisos."
  type        = string
}

variable "notifications" {
  description = "Avisos: porcentaje del límite y tipo (ACTUAL para el gasto real, FORECASTED para el pronóstico del mes)."
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
    error_message = "El tipo de cada aviso debe ser ACTUAL o FORECASTED."
  }
}

variable "cost_filter_tags" {
  description = "Filtra el costo por etiquetas de asignación de costos activadas en Billing (clave a valor). Vacío cuenta toda la cuenta."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Etiquetas adicionales del presupuesto."
  type        = map(string)
  default     = {}
}
