variable "name_prefix" {
  description = "Prefijo para los nombres de los recursos de base de datos."
  type        = string
}

variable "vpc_id" {
  description = "ID de la VPC donde vive la instancia."
  type        = string
}

variable "private_subnet_ids" {
  description = "Subredes privadas para el subnet group y el proxy."
  type        = list(string)
}

variable "endpoint_security_group_id" {
  description = "Security group de los endpoints de VPC. El proxy necesita HTTPS hacia Secrets Manager."
  type        = string
}

variable "allowed_security_group_ids" {
  description = "Security groups de clientes que pueden conectarse al proxy por el puerto 5432."
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "Versión mayor de PostgreSQL. AWS resuelve la última versión menor."
  type        = string
  default     = "17"
}

variable "instance_class" {
  description = "Clase de la instancia RDS."
  type        = string
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  description = "Almacenamiento inicial en GiB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Límite de autoescalado del almacenamiento en GiB."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Activa la instancia en espera en otra AZ."
  type        = bool
  default     = true
}

variable "read_replica_count" {
  description = "Número de réplicas de lectura de la instancia principal."
  type        = number
  default     = 1

  validation {
    condition     = var.read_replica_count >= 0 && var.read_replica_count <= 5
    error_message = "read_replica_count debe estar entre 0 y 5."
  }
}

variable "deletion_protection" {
  description = "Impide borrar la instancia mientras esté activo."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Días de retención de backups automáticos (PITR)."
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "backup_retention_period debe estar entre 1 y 35."
  }
}

variable "skip_final_snapshot" {
  description = "Omite el snapshot final al borrar la instancia. Solo para entornos desechables."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Nombre de la base de datos inicial."
  type        = string
  default     = "platform"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "db_name solo admite letras, números y guion bajo, y empieza por letra."
  }
}

variable "db_username" {
  description = "Usuario maestro. La contraseña la genera y guarda RDS en Secrets Manager."
  type        = string
  default     = "platform_admin"
}

variable "tags" {
  description = "Etiquetas adicionales para todos los recursos del módulo."
  type        = map(string)
  default     = {}
}
