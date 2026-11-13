variable "name_prefix" {
  description = "Prefijo de los nombres de la API y sus recursos."
  type        = string
}

variable "vpc_link" {
  description = "VPC link hacia el ALB interno de las APIs que corren en Fargate. Null si todas las APIs son Lambda."
  type = object({
    vpc_id     = string
    subnet_ids = list(string)
  })
  default = null
}

variable "origin_verify_enabled" {
  description = "Exige el encabezado X-Origin-Verify que agrega CloudFront: la API solo responde lo que pasó por CloudFront y su WAF."
  type        = bool
  default     = true
}

variable "origin_verify_secret_version" {
  description = "Versión del secreto de origen. Súbela para rotarlo; luego aplica edge para que CloudFront envíe el valor nuevo."
  type        = number
  default     = 1
}

variable "throttling_burst_limit" {
  description = "Ráfaga máxima de peticiones del stage."
  type        = number
  default     = 500
}

variable "throttling_rate_limit" {
  description = "Peticiones por segundo sostenidas del stage."
  type        = number
  default     = 1000
}

variable "log_retention_days" {
  description = "Días de retención de los access logs y de los logs del autorizador."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Días de recuperación del secreto de origen al borrarlo. 0 lo borra de inmediato (solo desechables)."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
