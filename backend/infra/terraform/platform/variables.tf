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
  description = "Ruta absoluta, o relativa a platform/, del JSON de la topología de mensajería exportado por backend/libs/platform/messaging. Obligatoria: no hay valor por defecto."
  type        = string
}

variable "alarm_topic_arn" {
  description = "ARN de un tópico SNS existente para las alarmas de DLQ y RDS. Se ignora si defines alarm_email."
  type        = string
  default     = null
}

variable "alarm_email" {
  description = "Correo que recibe las alarmas. Crea un tópico SNS cifrado y la suscripción (el destinatario debe confirmarla). En prod se requiere este valor o alarm_topic_arn."
  type        = string
  default     = null
}

variable "messaging_max_receive_count" {
  description = "Recepciones antes de mover un mensaje a la DLQ. Null usa el valor de cada cola en la topología."
  type        = number
  default     = null
}

variable "egress" {
  description = "Salida a Internet de las subredes privadas de aplicación: none, single_nat (dev) o per_az_nat (prod). Ver ADR 0016."
  type        = string
  default     = "per_az_nat"

  validation {
    condition     = contains(["none", "single_nat", "per_az_nat"], var.egress)
    error_message = "egress debe ser none, single_nat o per_az_nat."
  }
}

variable "flow_logs_retention_days" {
  description = "Días de retención de los flow logs de la VPC."
  type        = number
  default     = 90
}

variable "flow_logs_traffic_type" {
  description = "Tráfico que registran los flow logs: ALL, ACCEPT o REJECT."
  type        = string
  default     = "ALL"
}

variable "db_service_users" {
  description = "Usuarios de base de datos por servicio. Cada uno recibe un secreto con rotación y un esquema propio. Las apps nunca usan el usuario maestro."
  type = list(object({
    name            = string
    schema          = optional(string)
    create_schema   = optional(bool, true)
    rds_replication = optional(bool, false)
  }))
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

variable "valkey_users" {
  description = "Usuarios Valkey autenticados por IAM: nombre a ACL. Uno por servicio."
  type        = map(string)
  default = {
    app = "on ~* &* +@all -@dangerous"
  }
}
