variable "name_prefix" {
  description = "Prefijo para el nombre del bucket y la clave KMS. El bucket se llama <name_prefix>-files-<cuenta>."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "cors_allowed_origins" {
  description = "Orígenes que pueden subir y descargar con URLs prefirmadas desde el navegador, por ejemplo https://app.example.com."
  type        = list(string)

  validation {
    condition     = length(var.cors_allowed_origins) > 0 && !contains(var.cors_allowed_origins, "*")
    error_message = "Declara al menos un origen explícito. No se admite el comodín."
  }
}

variable "cors_max_age_seconds" {
  description = "Segundos que el navegador cachea la respuesta preflight."
  type        = number
  default     = 3000
}

variable "versioning_enabled" {
  description = "Activa el versionado del bucket."
  type        = bool
  default     = true
}

variable "noncurrent_version_expiration_days" {
  description = "Días que se conservan las versiones no vigentes. Solo aplica con versionado."
  type        = number
  default     = 90

  validation {
    condition     = var.noncurrent_version_expiration_days >= 1
    error_message = "noncurrent_version_expiration_days debe ser al menos 1."
  }
}

variable "temporary_prefix" {
  description = "Prefijo de las subidas pendientes de confirmar. Sus objetos expiran tras temporary_expiration_days. Vacío lo desactiva."
  type        = string
  default     = "tmp/"
}

variable "temporary_expiration_days" {
  description = "Días tras los cuales expiran los objetos bajo temporary_prefix."
  type        = number
  default     = 1

  validation {
    condition     = var.temporary_expiration_days >= 1
    error_message = "temporary_expiration_days debe ser al menos 1."
  }
}

variable "intelligent_tiering_days" {
  description = "Días tras los cuales los objetos pasan a Intelligent-Tiering. Null lo desactiva."
  type        = number
  default     = 30

  validation {
    condition     = var.intelligent_tiering_days == null || coalesce(var.intelligent_tiering_days, 0) >= 0
    error_message = "intelligent_tiering_days no puede ser negativo."
  }
}

variable "kms_key_arn" {
  description = "Clave KMS existente para cifrar el bucket. Si es null, el módulo crea la suya."
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "Permite borrar el bucket aunque tenga objetos. Solo para entornos desechables."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
