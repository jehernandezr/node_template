variable "service_name" {
  description = "Service name, the same as its app in backend/apps and its key in db_services and valkey_services of the data stack."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{1,20}$", var.service_name))
    error_message = "service_name uses lowercase letters, digits and underscores, starts with a letter and is 2 to 21 characters long."
  }
}

# --- Artifacts (the pipeline passes them with TF_VAR_image and TF_VAR_lambda_package) ---

variable "image" {
  description = "Service image for everything that runs on Fargate (API, realtime and workers). Pin it by digest or immutable tag."
  type        = string
  default     = null
}

variable "lambda_package" {
  description = "esbuild bundle of the service for everything that runs on Lambda (API and consumers): s3_bucket and s3_key, or a local filename."
  type = object({
    s3_bucket         = optional(string)
    s3_key            = optional(string)
    s3_object_version = optional(string)
    filename          = optional(string)
    source_code_hash  = optional(string)
  })
  default = null
}

# --- Entry points ---------------------------------------------------------------

variable "api" {
  description = <<-EOT
    HTTP API of the service in the shared API, behind CloudFront and its WAF.
    runtime "lambda": function with the lambda.ts adapter; "fargate": container with main.ts behind
    the internal ALB and the VPC link (requires fargate_api_enabled in platform and a listener_rule_priority
    unique across services). Changing the runtime means changing this field and the artifact.
  EOT
  type = object({
    runtime        = string
    route_prefixes = list(string)

    # Lambda
    handler                        = optional(string, "lambda.handler")
    memory_size                    = optional(number, 1024)
    timeout                        = optional(number, 29)
    reserved_concurrent_executions = optional(number)

    # Fargate
    command                = optional(list(string))
    container_port         = optional(number, 3000)
    cpu                    = optional(number, 512)
    memory                 = optional(number, 1024)
    desired_count          = optional(number, 1)
    min_capacity           = optional(number, 1)
    max_capacity           = optional(number, 4)
    cpu_target_percent     = optional(number, 60)
    health_check_path      = optional(string, "/health")
    spot                   = optional(bool, false)
    listener_rule_priority = optional(number)

    # API's own permissions
    files_access = optional(bool, false)
    ses_send     = optional(bool, false)
  })
  default = null

  validation {
    condition     = var.api == null || contains(["lambda", "fargate"], try(var.api.runtime, ""))
    error_message = "api.runtime must be lambda or fargate."
  }

  validation {
    condition     = var.api == null || try(var.api.runtime, "") != "fargate" || try(var.api.listener_rule_priority, null) != null
    error_message = "A Fargate API needs listener_rule_priority, unique across the services of the internal ALB."
  }
}

variable "realtime" {
  description = "Realtime gateway (Socket.IO and SSE). Always on Fargate behind the platform public ALB. listener_rule_priority is unique across services. publish grants it the producer topics and queues from the topology."
  type = object({
    listener_rule_priority = number
    path_patterns          = optional(list(string), [])
    host_headers           = optional(list(string), [])
    command                = optional(list(string))
    container_port         = optional(number, 3000)
    cpu                    = optional(number, 512)
    memory                 = optional(number, 1024)
    desired_count          = optional(number, 1)
    min_capacity           = optional(number, 1)
    max_capacity           = optional(number, 4)
    cpu_target_percent     = optional(number, 60)
    health_check_path      = optional(string, "/health")
    publish                = optional(bool, false)
    files_access           = optional(bool, false)
    ses_send               = optional(bool, false)
  })
  default = null

  validation {
    condition     = var.realtime == null || length(try(var.realtime.path_patterns, [])) + length(try(var.realtime.host_headers, [])) > 0
    error_message = "realtime needs path_patterns or host_headers."
  }
}

variable "workers" {
  description = "Fargate workers (worker.ts) that consume a queue and scale on its depth, from zero."
  type = map(object({
    queue               = string
    command             = optional(list(string))
    cpu                 = optional(number, 512)
    memory              = optional(number, 1024)
    min_capacity        = optional(number, 0)
    max_capacity        = optional(number, 4)
    spot                = optional(bool, true)
    scale_out_threshold = optional(number, 1)
    messages_per_task   = optional(number, 100)
    steps               = optional(number, 5)
    scale_in_periods    = optional(number, 10)
    files_access        = optional(bool, false)
    ses_send            = optional(bool, false)
  }))
  default = {}
}

variable "consumers" {
  description = "Lambda consumers of a queue (SQS adapter with partial failures)."
  type = map(object({
    queue                           = string
    handler                         = string
    memory_size                     = optional(number, 512)
    timeout                         = optional(number, 30)
    batch_size                      = optional(number, 10)
    maximum_batching_window_seconds = optional(number, 0)
    maximum_concurrency             = optional(number, 5)
    filter_patterns                 = optional(list(string), [])
    files_access                    = optional(bool, false)
    ses_send                        = optional(bool, false)
  }))
  default = {}
}

# --- Access to shared resources ------------------------------------------------------

variable "database_access" {
  description = "Uses its user and its databases (shards and catalog) from the data stack. Receives DB_CREDENTIALS or DB_SECRET_ARN and DB_DATABASES."
  type        = bool
  default     = true
}

variable "valkey_access" {
  description = "Uses its Valkey user (prefix <service>:). Requires the service in valkey_services of the data stack."
  type        = bool
  default     = true
}

variable "environment_variables" {
  description = "The service's own environment variables. They do not replace the platform ones (SERVICE_NAME, AWS_*, DB_*, VALKEY_*...)."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Own secrets: variable name to valueFrom (Secrets Manager ARN, with an optional JSON key)."
  type        = map(string)
  default     = {}
}

variable "secrets_kms_key_arns" {
  description = "CMK of the own secrets."
  type        = list(string)
  default     = []
}

variable "task_policies" {
  description = "Own inline IAM policies (name to JSON) for all roles of the service. What only one component uses fits better in an option of that component."
  type        = map(string)
  default     = {}
}

variable "lambda_runtime" {
  description = "Runtime of the service functions. It must be the major version in .nvmrc; service-lambda rejects any other."
  type        = string
  default     = "nodejs24.x"
}

variable "lambda_otel_layer_arn" {
  description = "ADOT layer of the Lambdas. Confirm the current ARN for the region and architecture. Null disables it."
  type        = string
  default     = null
}

variable "enable_execute_command" {
  description = "ECS Exec on the Fargate tasks of the service. It is audited with the cluster CMK."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Retention in days of the service logs."
  type        = number
  default     = 30
}
