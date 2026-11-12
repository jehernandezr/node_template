variable "name_prefix" {
  description = "Prefijo para los nombres de los recursos de caché. Máximo 22 caracteres."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "vpc_id" {
  description = "ID de la VPC donde vive la caché."
  type        = string
}

variable "subnet_ids" {
  description = "Subredes privadas para la caché."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups de clientes que pueden conectarse por los puertos 6379-6380."
  type        = list(string)
  default     = []
}

variable "snapshot_retention_limit" {
  description = "Días de retención de snapshots diarios de la caché."
  type        = number
  default     = 1

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "snapshot_retention_limit debe estar entre 0 y 35."
  }
}

variable "cache_usage_limits" {
  description = "Límites de uso de la caché serverless: almacenamiento en GB y ECPU por segundo."
  type = object({
    data_storage_max_gb = number
    ecpu_per_second_max = number
  })
  default = {
    data_storage_max_gb = 1
    ecpu_per_second_max = 1000
  }
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
