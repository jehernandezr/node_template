variable "region" {
  description = "Región AWS de este stack. Cada región tiene su propia raíz platform."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno del stack."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment debe ser dev, staging o prod."
  }
}

variable "name_prefix" {
  description = "Prefijo de nombres para todos los recursos, por ejemplo node-template-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "vpc_cidr" {
  description = "CIDR /16 de la VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_engine_version" {
  description = "Versión mayor de PostgreSQL."
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  description = "Clase de la instancia RDS."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "Almacenamiento inicial de RDS en GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Límite de autoescalado del almacenamiento de RDS en GiB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Activa Multi-AZ en RDS."
  type        = bool
  default     = true
}

variable "db_read_replica_count" {
  description = "Número de réplicas de lectura de RDS."
  type        = number
  default     = 1
}

variable "db_deletion_protection" {
  description = "Protección contra borrado de la instancia RDS."
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Días de retención de backups de RDS (PITR)."
  type        = number
  default     = 7
}

variable "db_skip_final_snapshot" {
  description = "Omite el snapshot final al borrar RDS. Solo para entornos desechables."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Nombre de la base de datos inicial."
  type        = string
  default     = "platform"
}

variable "db_username" {
  description = "Usuario maestro de RDS."
  type        = string
  default     = "platform_admin"
}

variable "valkey_snapshot_retention_limit" {
  description = "Días de retención de snapshots de Valkey."
  type        = number
  default     = 1
}

variable "valkey_cache_usage_limits" {
  description = "Límites de la caché Valkey serverless."
  type = object({
    data_storage_max_gb = number
    ecpu_per_second_max = number
  })
  default = {
    data_storage_max_gb = 1
    ecpu_per_second_max = 1000
  }
}

variable "topology_file" {
  description = "Ruta absoluta, o relativa a platform/, del JSON de la topología de mensajería."
  type        = string
  default     = "../examples/topology.example.json"
}

variable "alarm_topic_arn" {
  description = "ARN de un tópico SNS para las alarmas de DLQ. Null desactiva la notificación."
  type        = string
  default     = null
}
