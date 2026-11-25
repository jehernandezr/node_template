variable "db_services" {
  description = <<-EOT
    Services with a database. Each one gets a user with a rotated secret and one database per
    logical shard (<service>_shard_<n>), which it owns. catalog grants access to the catalog
    database: "owner" (migrates the catalog) or "read" (queries only). Same as the local environment.
  EOT
  type = map(object({
    shards  = optional(number, 1)
    catalog = optional(string)
  }))

  validation {
    condition     = alltrue([for name, svc in var.db_services : can(regex("^[a-z][a-z0-9_]{1,20}$", name))])
    error_message = "Service names use lowercase letters, digits and underscores, start with a letter and are 2 to 21 characters long."
  }

  validation {
    condition     = alltrue([for name, svc in var.db_services : svc.shards >= 1 && svc.shards <= 64])
    error_message = "shards must be between 1 and 64."
  }

  validation {
    condition     = alltrue([for name, svc in var.db_services : svc.catalog == null || contains(["owner", "read"], coalesce(svc.catalog, "-"))])
    error_message = "catalog must be owner, read or null."
  }
}

variable "db_replication_users" {
  description = "Users with logical replication permission and CONNECT on all databases, to move shards without downtime (SagaType.MoveShard)."
  type        = list(string)
  default     = ["replication"]
}

variable "db_extensions" {
  description = "Extensions the bootstrap creates in each database (catalog and shards)."
  type        = list(string)
  default     = ["vector"]
}

variable "db_engine_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS storage autoscaling limit in GiB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enables Multi-AZ on RDS."
  type        = bool
  default     = true
}

variable "db_read_replica_count" {
  description = "Number of read replicas. Apps read from them directly (outside Aurora, RDS Proxy only supports the writer)."
  type        = number
  default     = 1
}

variable "db_deletion_protection" {
  description = "Deletion protection for the RDS instance."
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "RDS backup retention in days (PITR)."
  type        = number
  default     = 7
}

variable "db_skip_final_snapshot" {
  description = "Skips the final snapshot when deleting RDS. Only for disposable environments."
  type        = bool
  default     = false
}

variable "db_username" {
  description = "RDS master user. Administration only."
  type        = string
  default     = "platform_admin"
}

variable "db_enable_secret_rotation" {
  description = "Enables automatic rotation of the database secrets."
  type        = bool
  default     = true
}

variable "db_secret_rotation_days" {
  description = "Days between rotations of the database secrets."
  type        = number
  default     = 30
}

variable "db_secret_recovery_window_days" {
  description = "Recovery window in days for a deleted secret. 0 deletes it immediately (disposable environments only)."
  type        = number
  default     = 30
}

variable "db_log_min_duration_statement_ms" {
  description = "Milliseconds from which a query is logged as slow."
  type        = number
  default     = 500
}

variable "db_performance_insights_retention_days" {
  description = "Performance Insights retention: 7 (free) or 731."
  type        = number
  default     = 7
}

variable "valkey_services" {
  description = "Services with an IAM-authenticated Valkey user. Each one only accesses the <service>:* keys and channels."
  type        = list(string)
  default     = []
}

variable "valkey_auth_writer" {
  description = "Service that writes the shared authentication state (auth:* keys and channel). The other services with a Valkey user only read it."
  type        = string
  default     = "identity"
}

variable "valkey_acl_overrides" {
  description = "Custom ACL per service when the prefix is not enough. Review it: an ACL with ~* grants access to everyone's keys."
  type        = map(string)
  default     = {}
}

variable "valkey_snapshot_retention_limit" {
  description = "Valkey snapshot retention in days."
  type        = number
  default     = 1
}

variable "valkey_cache_usage_limits" {
  description = "Limits of the serverless Valkey cache."
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
  description = "Retention in days for the PostgreSQL logs and the administration Lambdas."
  type        = number
  default     = 30
}
