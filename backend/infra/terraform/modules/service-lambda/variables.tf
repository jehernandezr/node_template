variable "name_prefix" {
  description = "Name prefix shared with the platform, for example nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "function_name" {
  description = "Short function name, for example billing-invoices. The final name is <name_prefix>-<function_name>."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}[a-z0-9]$", var.function_name))
    error_message = "function_name must use lowercase letters, digits and hyphens, and be 3 to 32 characters long."
  }
}

variable "description" {
  description = "Function description."
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment (dev, staging or prod). Published as deployment.environment in OpenTelemetry."
  type        = string
}

variable "role_arn" {
  description = "Function role (component-base), with the logs, secrets and component policies."
  type        = string
}

variable "role_name" {
  description = "Name of that role: the module attaches the async DLQ and the queue of the event source mapping to it."
  type        = string
}

variable "log_group_name" {
  description = "Log group of the function (component-base), /aws/lambda/<name_prefix>-<function_name>."
  type        = string
}

variable "kms_key_arn" {
  description = "CMK of the environment variables and the async DLQ. The function role must be allowed to use it (component-base)."
  type        = string
}

variable "security_group_id" {
  description = "Security group of the function (component-base). Required with vpc_enabled."
  type        = string
  default     = null
}

variable "handler" {
  description = "Function handler, for example lambda.handler."
  type        = string
}

variable "runtime" {
  description = "Lambda runtime. Its Node major version is the one in .nvmrc, which CI uses to build and test."
  type        = string
  default     = "nodejs24.x"
}

variable "filename" {
  description = "Local path of the bundle zip. Use filename or s3_bucket with s3_key, not both."
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "S3 bucket with the bundle zip."
  type        = string
  default     = null
}

variable "s3_key" {
  description = "S3 key of the bundle zip."
  type        = string
  default     = null
}

variable "s3_object_version" {
  description = "S3 object version of the bundle."
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Base64 SHA256 hash of the zip, so Terraform detects code changes."
  type        = string
  default     = null
}

variable "memory_size" {
  description = "Memory in MB."
  type        = number
  default     = 512

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "memory_size must be between 128 and 10240."
  }
}

variable "timeout" {
  description = "Maximum execution time in seconds. The source queue visibility timeout must be at least 6 times this value."
  type        = number
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "timeout must be between 1 and 900."
  }
}

variable "environment_variables" {
  description = "Function environment variables, without secret values: SECRETS_MAP names the ARNs the function reads at startup. They are encrypted with the module KMS key."
  type        = map(string)
  default     = {}
}

variable "reserved_concurrent_executions" {
  description = "Reserved concurrency. It protects the database from a spike and keeps the function from using the whole account. Null reserves nothing."
  type        = number
  default     = null
}

variable "layers" {
  description = "ARNs of additional layers."
  type        = list(string)
  default     = []
}

variable "otel_layer_arn" {
  description = "ARN of the ADOT OpenTelemetry layer for this region and the arm64 architecture. Null disables OpenTelemetry."
  type        = string
  default     = null
}

variable "otel_collector_config_uri" {
  description = "Location of the layer collector config, for example /var/task/collector.yaml, which forwards to OpenObserve. Null uses the layer default."
  type        = string
  default     = null
}

variable "tracing_mode" {
  description = "X-Ray tracing: Active or PassThrough."
  type        = string
  default     = "Active"

  validation {
    condition     = contains(["Active", "PassThrough"], var.tracing_mode)
    error_message = "tracing_mode must be Active or PassThrough."
  }
}

variable "application_log_level" {
  description = "Application log level in logging_config. It also feeds LOG_LEVEL."
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"], var.application_log_level)
    error_message = "application_log_level must be TRACE, DEBUG, INFO, WARN, ERROR or FATAL."
  }
}

variable "vpc_enabled" {
  description = "Runs the function inside the VPC (to reach RDS Proxy or Valkey). Requires vpc_id and subnet_ids."
  type        = bool
  default     = false
}

variable "additional_security_group_ids" {
  description = "Extra security groups for the function. The data clients one (data stack) opens egress to RDS Proxy, the replicas, Valkey and OpenObserve; the function's own group only allows HTTPS egress."
  type        = list(string)
  default     = []
}

variable "subnet_ids" {
  description = "Private subnets of the function. Required with vpc_enabled."
  type        = list(string)
  default     = []
}

variable "queue_arn" {
  description = "ARN of the source SQS queue. Its DLQ and redrive are defined by the messaging module. Null for a function without a queue, for example the API behind API Gateway."
  type        = string
  default     = null
}

variable "queue_kms_key_arn" {
  description = "KMS key of the source queue, to decrypt its messages. Null if the queue does not use a CMK."
  type        = string
  default     = null
}

variable "batch_size" {
  description = "Messages per invocation. Up to 10 on FIFO and 10000 on standard queues with a batching window."
  type        = number
  default     = 10

  validation {
    condition     = var.batch_size >= 1 && var.batch_size <= 10000
    error_message = "batch_size must be between 1 and 10000."
  }
}

variable "maximum_batching_window_seconds" {
  description = "Seconds Lambda waits to fill a batch. Between 0 and 300."
  type        = number
  default     = 0

  validation {
    condition     = var.maximum_batching_window_seconds >= 0 && var.maximum_batching_window_seconds <= 300
    error_message = "maximum_batching_window_seconds must be between 0 and 300."
  }
}

variable "maximum_concurrency" {
  description = "Maximum concurrent invocations from this queue. Between 2 and 1000. Null means no limit."
  type        = number
  default     = 5

  validation {
    condition     = var.maximum_concurrency == null || (coalesce(var.maximum_concurrency, 2) >= 2 && coalesce(var.maximum_concurrency, 2) <= 1000)
    error_message = "maximum_concurrency must be between 2 and 1000."
  }
}

variable "filter_patterns" {
  description = "SQS event filter patterns in JSON. Empty delivers all messages."
  type        = list(string)
  default     = []
}

variable "event_source_enabled" {
  description = "Enables the queue mapping. Disable it to pause consumption."
  type        = bool
  default     = true
}

variable "async_dlq_retention_seconds" {
  description = "Retention of the dead letter queue for asynchronous invocations."
  type        = number
  default     = 1209600
}

variable "alarm_topic_arn" {
  description = "ARN of an SNS topic for the error and DLQ alarms. If null, the alarms do not notify."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
