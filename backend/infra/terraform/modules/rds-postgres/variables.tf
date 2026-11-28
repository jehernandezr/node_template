variable "name_prefix" {
  description = "Prefix for the names of the database resources."
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where the instance lives."
  type        = string
}

variable "data_subnet_ids" {
  description = "Data subnets (no route to the Internet) for the subnet group, the proxy and the admin Lambdas."
  type        = list(string)
}

variable "service_users" {
  description = "Database users per service. Each one gets a secret in Secrets Manager with rotation. Apps never use the master user. rds_replication grants the logical replication permission and CONNECT on all databases."
  type = list(object({
    name            = string
    rds_replication = optional(bool, false)
  }))

  validation {
    condition     = length(var.service_users) >= 1
    error_message = "Declare at least one service user."
  }

  validation {
    condition     = alltrue([for u in var.service_users : can(regex("^[a-z][a-z0-9_]{1,29}$", u.name))])
    error_message = "User names use lowercase letters, digits and underscores, start with a letter and are 2 to 30 characters long."
  }

  validation {
    condition     = length(distinct([for u in var.service_users : u.name])) == length(var.service_users)
    error_message = "Service user names must be unique."
  }
}

variable "group_roles" {
  description = "Group roles without login. members are users from service_users."
  type = list(object({
    name    = string
    members = optional(list(string), [])
  }))
  default = []

  validation {
    condition     = alltrue([for g in var.group_roles : can(regex("^[a-z][a-z0-9_]{1,62}$", g.name))])
    error_message = "Group roles use lowercase letters, digits and underscores and start with a letter."
  }
}

variable "databases" {
  description = "Databases the bootstrap creates: name, owner (service user or group role), roles with read access and extensions. Removing a database from the list does not drop it."
  type = list(object({
    name       = string
    owner      = string
    readers    = optional(list(string), [])
    extensions = optional(list(string), [])
  }))
  default = []

  validation {
    condition     = alltrue([for d in var.databases : can(regex("^[a-z][a-z0-9_]{0,62}$", d.name)) && !contains(["postgres", "rdsadmin", "template0", "template1"], d.name)])
    error_message = "Database names use lowercase letters, digits and underscores, start with a letter and cannot be system databases."
  }

  validation {
    condition     = length(distinct([for d in var.databases : d.name])) == length(var.databases)
    error_message = "Database names must be unique."
  }
}

variable "log_retention_days" {
  description = "Retention days for the PostgreSQL logs and for the bootstrap and rotation Lambdas."
  type        = number
  default     = 30
}

variable "enable_secret_rotation" {
  description = "Enables automatic rotation of the service secrets with the official AWS function."
  type        = bool
  default     = true
}

variable "secret_rotation_days" {
  description = "Days between rotations of the service secrets."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Recovery days for a deleted secret. 0 deletes it immediately (disposable environments only)."
  type        = number
  default     = 30

  validation {
    condition     = var.secret_recovery_window_days == 0 || (var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30)
    error_message = "secret_recovery_window_days must be 0 or between 7 and 30."
  }
}

variable "log_min_duration_statement_ms" {
  description = "Milliseconds after which PostgreSQL logs a slow query. -1 disables it."
  type        = number
  default     = 500
}

variable "max_replication_slots" {
  description = "Available replication slots. Each shard move through logical replication uses one."
  type        = number
  default     = 10
}

variable "performance_insights_retention_days" {
  description = "Performance Insights retention in days. 7 is free; 731 has a cost."
  type        = number
  default     = 7

  validation {
    condition     = contains([7, 731], var.performance_insights_retention_days)
    error_message = "performance_insights_retention_days must be 7 or 731."
  }
}

variable "alarm_topic_arn" {
  description = "ARN of the SNS topic that receives the RDS alarms. Null leaves the alarms without notification."
  type        = string
  default     = null
}

variable "alarm_cpu_percent" {
  description = "CPU percentage that triggers the alarm."
  type        = number
  default     = 80
}

variable "alarm_free_storage_bytes" {
  description = "Free bytes below which the storage alarm fires."
  type        = number
  default     = 10737418240
}

variable "alarm_freeable_memory_bytes" {
  description = "Freeable memory bytes below which the alarm fires."
  type        = number
  default     = 268435456
}

variable "alarm_replica_lag_seconds" {
  description = "Seconds of replica lag that trigger the alarm."
  type        = number
  default     = 30
}

variable "endpoint_security_group_id" {
  description = "Security group of the VPC endpoints. The proxy needs HTTPS to Secrets Manager."
  type        = string
}

variable "allowed_security_group_ids" {
  description = "Security groups of clients that can connect to the proxy and the replicas on port 5432."
  type        = list(string)
  default     = []
}

variable "engine_version" {
  description = "PostgreSQL major version. AWS resolves the latest minor version."
  type        = string
  default     = "17"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  description = "Initial storage in GiB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Storage autoscaling limit in GiB."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Enables the standby instance in another AZ."
  type        = bool
  default     = true
}

variable "read_replica_count" {
  description = "Number of read replicas of the primary instance."
  type        = number
  default     = 1

  validation {
    condition     = var.read_replica_count >= 0 && var.read_replica_count <= 5
    error_message = "read_replica_count must be between 0 and 5."
  }
}

variable "deletion_protection" {
  description = "Prevents deleting the instance while enabled."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Retention days for automated backups (PITR)."
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "backup_retention_period must be between 1 and 35."
  }
}

variable "skip_final_snapshot" {
  description = "Skips the final snapshot when deleting the instance. Disposable environments only."
  type        = bool
  default     = false
}

variable "db_username" {
  description = "Master user. RDS generates the password and stores it in Secrets Manager."
  type        = string
  default     = "platform_admin"
}

variable "tags" {
  description = "Additional tags for all the module resources."
  type        = map(string)
  default     = {}
}
