variable "name_prefix" {
  description = "Prefix for the bucket name and the KMS key. The bucket is named <name_prefix>-files-<account>."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "cors_allowed_origins" {
  description = "Origins that can upload and download with presigned URLs from the browser, for example https://app.example.com."
  type        = list(string)

  validation {
    condition     = length(var.cors_allowed_origins) > 0 && !contains(var.cors_allowed_origins, "*")
    error_message = "Declare at least one explicit origin. The wildcard is not allowed."
  }
}

variable "cors_max_age_seconds" {
  description = "Seconds the browser caches the preflight response."
  type        = number
  default     = 3000
}

variable "versioning_enabled" {
  description = "Enables bucket versioning."
  type        = bool
  default     = true
}

variable "noncurrent_version_expiration_days" {
  description = "Days to keep noncurrent versions. Applies only with versioning."
  type        = number
  default     = 90

  validation {
    condition     = var.noncurrent_version_expiration_days >= 1
    error_message = "noncurrent_version_expiration_days must be at least 1."
  }
}

variable "temporary_prefix" {
  description = "Prefix for uploads pending confirmation. Its objects expire after temporary_expiration_days. Empty disables it."
  type        = string
  default     = "tmp/"
}

variable "temporary_expiration_days" {
  description = "Days after which objects under temporary_prefix expire."
  type        = number
  default     = 1

  validation {
    condition     = var.temporary_expiration_days >= 1
    error_message = "temporary_expiration_days must be at least 1."
  }
}

variable "intelligent_tiering_days" {
  description = "Days after which objects move to Intelligent-Tiering. Null disables it."
  type        = number
  default     = 30

  validation {
    condition     = var.intelligent_tiering_days == null || coalesce(var.intelligent_tiering_days, 0) >= 0
    error_message = "intelligent_tiering_days cannot be negative."
  }
}

variable "kms_key_arn" {
  description = "Existing KMS key to encrypt the bucket. If null, the module creates its own."
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "Allows deleting the bucket even if it has objects. Only for disposable environments."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
