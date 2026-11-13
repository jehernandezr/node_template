variable "db_services" {
  description = <<-EOT
    Servicios con base de datos. Cada uno recibe un usuario con secreto rotado y una base por
    shard lógico (<servicio>_shard_<n>), de la que es dueño. catalog da acceso a la base
    catalog: "owner" (migra el catálogo) o "read" (solo consulta). Igual que el entorno local.
  EOT
  type = map(object({
    shards  = optional(number, 1)
    catalog = optional(string)
  }))

  validation {
    condition     = alltrue([for name, svc in var.db_services : can(regex("^[a-z][a-z0-9_]{1,20}$", name))])
    error_message = "Los nombres de servicio usan minúsculas, números y guion bajo, empiezan por letra y tienen entre 2 y 21 caracteres."
  }

  validation {
    condition     = alltrue([for name, svc in var.db_services : svc.shards >= 1 && svc.shards <= 64])
    error_message = "shards debe estar entre 1 y 64."
  }

  validation {
    condition     = alltrue([for name, svc in var.db_services : svc.catalog == null || contains(["owner", "read"], coalesce(svc.catalog, "-"))])
    error_message = "catalog debe ser owner, read o null."
  }
}

variable "db_replication_users" {
  description = "Usuarios con permiso de replicación lógica y CONNECT en todas las bases, para mover shards sin corte (SagaType.MoveShard)."
  type        = list(string)
  default     = ["replication"]
}

variable "db_extensions" {
  description = "Extensiones que el bootstrap crea en cada base (catálogo y shards)."
  type        = list(string)
  default     = ["vector"]
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
  description = "Número de réplicas de lectura. Las apps leen directo de ellas (RDS Proxy solo admite la escritora fuera de Aurora)."
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
  description = "Omite el snapshot final al borrar RDS. Solo para ambientes desechables."
  type        = bool
  default     = false
}

variable "db_username" {
  description = "Usuario maestro de RDS. Solo administración."
  type        = string
  default     = "platform_admin"
}

variable "db_enable_secret_rotation" {
  description = "Activa la rotación automática de los secretos de base de datos."
  type        = bool
  default     = true
}

variable "db_secret_rotation_days" {
  description = "Días entre rotaciones de los secretos de base de datos."
  type        = number
  default     = 30
}

variable "db_secret_recovery_window_days" {
  description = "Días de recuperación de un secreto borrado. 0 lo borra de inmediato (solo desechables)."
  type        = number
  default     = 30
}

variable "db_log_min_duration_statement_ms" {
  description = "Milisegundos desde los que se registra una consulta lenta."
  type        = number
  default     = 500
}

variable "db_performance_insights_retention_days" {
  description = "Retención de Performance Insights: 7 (gratis) o 731."
  type        = number
  default     = 7
}

variable "valkey_services" {
  description = "Servicios con usuario Valkey autenticado por IAM. Cada uno solo accede a las llaves y canales <servicio>:*."
  type        = list(string)
  default     = []
}

variable "valkey_acl_overrides" {
  description = "ACL propia por servicio cuando el prefijo no alcanza. Revísala: una ACL con ~* da acceso a las llaves de todos."
  type        = map(string)
  default     = {}
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

variable "log_retention_days" {
  description = "Días de retención de los logs de PostgreSQL y de las Lambdas de administración."
  type        = number
  default     = 30
}
