variable "name_prefix" {
  description = "Prefix for the names of the cache resources. At most 22 characters."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "vpc_id" {
  description = "ID of the VPC where the cache lives."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the cache."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Client security groups that can connect on ports 6379-6380."
  type        = list(string)
  default     = []
}

variable "users" {
  description = "IAM-authenticated Valkey users, per service: name to ACL (access string). The default user is disabled."
  type        = map(string)
  default = {
    app = "on ~* &* +@all -@dangerous"
  }

  validation {
    condition     = length(var.users) >= 1 && alltrue([for k in keys(var.users) : can(regex("^[a-z][a-z0-9-]{0,19}$", k))])
    error_message = "Declare at least one user. Names use lowercase letters, digits and hyphens, with up to 20 characters."
  }
}

variable "snapshot_retention_limit" {
  description = "Retention in days for the daily cache snapshots."
  type        = number
  default     = 1

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "snapshot_retention_limit must be between 0 and 35."
  }
}

variable "cache_usage_limits" {
  description = "Usage limits of the serverless cache: storage in GB and ECPU per second."
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
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
