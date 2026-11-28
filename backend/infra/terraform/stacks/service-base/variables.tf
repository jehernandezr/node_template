variable "service_name" {
  description = "Service name, the same as its app in backend/apps and its key in db_services and valkey_services of the data stack."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{1,20}$", var.service_name))
    error_message = "service_name uses lowercase letters, digits and underscores, starts with a letter and is 2 to 21 characters long."
  }
}

# --- Components ---------------------------------------------------------------
# Which components the service runs and what each one may use. This stack owns their roles, log groups and
# security groups; the service stack runs them with the routes and sizes of its own tfvars, under the same keys.

variable "api" {
  description = "HTTP API of the service. runtime \"lambda\" gets a function role, \"fargate\" an execution and a task role. Changing the runtime means changing this field, the artifact and the service stack."
  type = object({
    runtime      = string
    files_access = optional(bool, false)
    ses_send     = optional(bool, false)
  })
  default = null

  validation {
    condition     = var.api == null || contains(["lambda", "fargate"], try(var.api.runtime, ""))
    error_message = "api.runtime must be lambda or fargate."
  }
}

variable "realtime" {
  description = "Realtime gateway (Socket.IO and SSE), always on Fargate. publish grants it the producer topics and queues from the topology."
  type = object({
    publish      = optional(bool, false)
    files_access = optional(bool, false)
    ses_send     = optional(bool, false)
  })
  default = null
}

variable "workers" {
  description = "Fargate workers (worker.ts). Each runs the outbox relay, the jobs and saga recovery (ADR 0039). With queue it consumes only that queue and receives its QUEUE_URL; without queue it consumes nothing, for a service whose contract has no queues."
  type = map(object({
    queue        = optional(string)
    files_access = optional(bool, false)
    ses_send     = optional(bool, false)
  }))
  default = {}
}

variable "consumers" {
  description = "Lambda consumers of a queue. The service stack attaches the queue to the function role with its event source mapping."
  type = map(object({
    queue        = string
    files_access = optional(bool, false)
    ses_send     = optional(bool, false)
  }))
  default = {}
}

variable "one_off_task" {
  description = "Size of the one-off Fargate tasks the pipeline registers with the new image: migrate from migrate_task, seed from one_off_task and, for identity, signing-keys from signing_keys_task (ADR 0043)."
  type = object({
    cpu    = optional(number, 512)
    memory = optional(number, 1024)
  })
  default = {}
}

# --- Access to shared resources ------------------------------------------------------

variable "database_access" {
  description = "Uses its roles and its databases (shards and catalog) from the data stack: the DB_* variables with DB_AUTH=iam and rds-db:connect for the app and reader roles (only the owner role in the migrate task)."
  type        = bool
  default     = true
}

variable "database_pool_max" {
  description = "Connections of each pool (DB_POOL_MAX). Transactions pin their RDS Proxy connection, so size it for pinned connections (ADR 0041)."
  type        = number
  default     = 10
}

variable "database_statement_timeout_ms" {
  description = "Statement timeout of each connection in milliseconds (DB_STATEMENT_TIMEOUT_MS)."
  type        = number
  default     = 30000
}

variable "database_connect_timeout_ms" {
  description = "Time a new connection has to reach the proxy or a replica in milliseconds (DB_CONNECT_TIMEOUT_MS), so a shard that does not answer fails within the deadline of a cross-shard walk."
  type        = number
  default     = 5000

  validation {
    condition     = var.database_connect_timeout_ms >= 1 && floor(var.database_connect_timeout_ms) == var.database_connect_timeout_ms
    error_message = "database_connect_timeout_ms must be a whole number of milliseconds of at least 1."
  }
}

variable "environment_variables" {
  description = "The service's own environment variables. They do not replace the platform ones (SERVICE_NAME, AWS_*, DB_*, VALKEY_*, REGIONS, SERVICE_REGION...)."
  type        = map(string)
  default     = {}

  validation {
    condition     = !contains(keys(var.environment_variables), "TENANT_MOVE_TARGETS")
    error_message = "TENANT_MOVE_TARGETS stays unset in a deployed environment: each shard's group follows the naming convention (ADR 0042)."
  }
}

variable "generated_secrets" {
  description = "Variables whose value this stack generates: a random 64-character value in a Secrets Manager secret of the service, written once through a write-only attribute so it never reaches the state (ADR 0041). Every component receives them, Fargate through valueFrom and Lambda through SECRETS_MAP."
  type        = set(string)
  default     = []

  validation {
    condition     = alltrue([for name in var.generated_secrets : can(regex("^[A-Z][A-Z0-9_]*$", name))])
    error_message = "generated_secrets are environment variable names in uppercase, such as IDENTITY_DATA_KEY."
  }
}

variable "secret_recovery_window_days" {
  description = "Recovery window in days for a deleted secret of the service. 0 deletes it immediately (disposable environments only)."
  type        = number
  default     = 30
}

variable "secrets" {
  description = "Secrets created outside this stack: variable name to valueFrom (Secrets Manager ARN, with an optional JSON key). The secrets of generated_secrets and identity's signing keys are not listed here."
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

variable "enable_execute_command" {
  description = "ECS Exec on the Fargate tasks of the service: grants the task roles its channels, and the service stack enables it on the ECS services. It is audited with the cluster CMK."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Retention in days of the service logs."
  type        = number
  default     = 30
}
