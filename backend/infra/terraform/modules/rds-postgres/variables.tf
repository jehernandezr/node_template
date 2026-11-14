variable "name_prefix" {
  description = "Prefijo para los nombres de los recursos de base de datos."
  type        = string
}

variable "vpc_id" {
  description = "ID de la VPC donde vive la instancia."
  type        = string
}

variable "data_subnet_ids" {
  description = "Subredes de datos (sin ruta a Internet) para el subnet group, el proxy y las lambdas de administración."
  type        = list(string)
}

variable "service_users" {
  description = "Usuarios de base de datos por servicio. Cada uno recibe un secreto en Secrets Manager con rotación. Las apps nunca usan el usuario maestro. rds_replication da el permiso de replicación lógica y CONNECT en todas las bases."
  type = list(object({
    name            = string
    rds_replication = optional(bool, false)
  }))

  validation {
    condition     = length(var.service_users) >= 1
    error_message = "Declara al menos un usuario de servicio."
  }

  validation {
    condition     = alltrue([for u in var.service_users : can(regex("^[a-z][a-z0-9_]{1,29}$", u.name))])
    error_message = "Los nombres de usuario usan minúsculas, números y guion bajo, empiezan por letra y tienen entre 2 y 30 caracteres."
  }

  validation {
    condition     = length(distinct([for u in var.service_users : u.name])) == length(var.service_users)
    error_message = "Los nombres de usuario de servicio no pueden repetirse."
  }
}

variable "group_roles" {
  description = "Roles de grupo sin login, por ejemplo catalog_owner y catalog_reader. members son usuarios de service_users."
  type = list(object({
    name    = string
    members = optional(list(string), [])
  }))
  default = []

  validation {
    condition     = alltrue([for g in var.group_roles : can(regex("^[a-z][a-z0-9_]{1,62}$", g.name))])
    error_message = "Los roles de grupo usan minúsculas, números y guion bajo y empiezan por letra."
  }
}

variable "databases" {
  description = "Bases que crea el bootstrap: nombre, dueño (usuario de servicio o rol de grupo), roles con lectura y extensiones. Quitar una base de la lista no la borra."
  type = list(object({
    name       = string
    owner      = string
    readers    = optional(list(string), [])
    extensions = optional(list(string), [])
  }))
  default = []

  validation {
    condition     = alltrue([for d in var.databases : can(regex("^[a-z][a-z0-9_]{0,62}$", d.name)) && !contains(["postgres", "rdsadmin", "template0", "template1"], d.name)])
    error_message = "Los nombres de base usan minúsculas, números y guion bajo, empiezan por letra y no pueden ser bases del sistema."
  }

  validation {
    condition     = length(distinct([for d in var.databases : d.name])) == length(var.databases)
    error_message = "Los nombres de base no pueden repetirse."
  }
}

variable "log_retention_days" {
  description = "Días de retención de los logs de PostgreSQL y de las Lambdas de bootstrap y rotación."
  type        = number
  default     = 30
}

variable "enable_secret_rotation" {
  description = "Activa la rotación automática de los secretos de servicio con la función oficial de AWS."
  type        = bool
  default     = true
}

variable "secret_rotation_days" {
  description = "Días entre rotaciones de los secretos de servicio."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Días de recuperación de un secreto borrado. 0 lo borra de inmediato (solo entornos desechables)."
  type        = number
  default     = 30

  validation {
    condition     = var.secret_recovery_window_days == 0 || (var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30)
    error_message = "secret_recovery_window_days debe ser 0 o estar entre 7 y 30."
  }
}

variable "log_min_duration_statement_ms" {
  description = "Milisegundos a partir de los cuales PostgreSQL registra una consulta lenta. -1 desactiva."
  type        = number
  default     = 500
}

variable "max_replication_slots" {
  description = "Slots de replicación disponibles. Los traslados de shard por replicación lógica consumen uno cada uno."
  type        = number
  default     = 10
}

variable "performance_insights_retention_days" {
  description = "Retención de Performance Insights en días. 7 es gratis; 731 tiene costo."
  type        = number
  default     = 7

  validation {
    condition     = contains([7, 731], var.performance_insights_retention_days)
    error_message = "performance_insights_retention_days debe ser 7 o 731."
  }
}

variable "alarm_topic_arn" {
  description = "ARN del tópico SNS que recibe las alarmas de RDS. Null deja las alarmas sin notificación."
  type        = string
  default     = null
}

variable "alarm_cpu_percent" {
  description = "Porcentaje de CPU que dispara la alarma."
  type        = number
  default     = 80
}

variable "alarm_free_storage_bytes" {
  description = "Bytes libres por debajo de los cuales suena la alarma de almacenamiento."
  type        = number
  default     = 10737418240
}

variable "alarm_freeable_memory_bytes" {
  description = "Bytes de memoria liberable por debajo de los cuales suena la alarma."
  type        = number
  default     = 268435456
}

variable "alarm_replica_lag_seconds" {
  description = "Segundos de retraso de réplica que disparan la alarma."
  type        = number
  default     = 30
}

variable "endpoint_security_group_id" {
  description = "Security group de los endpoints de VPC. El proxy necesita HTTPS hacia Secrets Manager."
  type        = string
}

variable "allowed_security_group_ids" {
  description = "Security groups de clientes que pueden conectarse al proxy y a las réplicas por el puerto 5432."
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
