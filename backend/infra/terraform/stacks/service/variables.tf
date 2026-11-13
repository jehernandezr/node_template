variable "service_name" {
  description = "Nombre del servicio, igual que su app en backend/apps y su clave en db_services y valkey_services del stack data."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{1,20}$", var.service_name))
    error_message = "service_name usa minúsculas, números y guion bajo, empieza por letra y tiene entre 2 y 21 caracteres."
  }
}

# --- Artefactos (los pasa el pipeline con TF_VAR_image y TF_VAR_lambda_package) -----

variable "image" {
  description = "Imagen del servicio para todo lo que corre en Fargate (API, tiempo real y workers). Fíjala por digest o tag inmutable."
  type        = string
  default     = null
}

variable "lambda_package" {
  description = "Bundle esbuild del servicio para todo lo que corre en Lambda (API y consumidores): s3_bucket y s3_key, o filename local."
  type = object({
    s3_bucket         = optional(string)
    s3_key            = optional(string)
    s3_object_version = optional(string)
    filename          = optional(string)
    source_code_hash  = optional(string)
  })
  default = null
}

# --- Entradas -------------------------------------------------------------------

variable "api" {
  description = <<-EOT
    API HTTP del servicio en la API compartida, detrás de CloudFront y su WAF.
    runtime "lambda": función con el adaptador lambda.ts; "fargate": contenedor con main.ts detrás
    del ALB interno y el VPC link (requiere fargate_api_enabled en platform y listener_rule_priority
    único entre servicios). Cambiar de runtime es cambiar este campo y el artefacto.
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
  })
  default = null

  validation {
    condition     = var.api == null || contains(["lambda", "fargate"], try(var.api.runtime, ""))
    error_message = "api.runtime debe ser lambda o fargate."
  }

  validation {
    condition     = var.api == null || try(var.api.runtime, "") != "fargate" || try(var.api.listener_rule_priority, null) != null
    error_message = "Una API en Fargate necesita listener_rule_priority, único entre los servicios del ALB interno."
  }
}

variable "realtime" {
  description = "Gateway de tiempo real (Socket.IO y SSE). Siempre en Fargate detrás del ALB público de platform. listener_rule_priority es único entre servicios."
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
  })
  default = null

  validation {
    condition     = var.realtime == null || length(try(var.realtime.path_patterns, [])) + length(try(var.realtime.host_headers, [])) > 0
    error_message = "realtime necesita path_patterns o host_headers."
  }
}

variable "workers" {
  description = "Workers Fargate (worker.ts) que consumen una cola y escalan por su profundidad, desde cero."
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
  }))
  default = {}
}

variable "consumers" {
  description = "Consumidores Lambda de una cola (adaptador SQS con fallos parciales)."
  type = map(object({
    queue                           = string
    handler                         = string
    memory_size                     = optional(number, 512)
    timeout                         = optional(number, 30)
    batch_size                      = optional(number, 10)
    maximum_batching_window_seconds = optional(number, 0)
    maximum_concurrency             = optional(number, 5)
    filter_patterns                 = optional(list(string), [])
  }))
  default = {}
}

# --- Acceso a recursos compartidos ---------------------------------------------------

variable "database_access" {
  description = "Usa su usuario y sus bases (shards y catálogo) del stack data. Recibe DB_CREDENTIALS o DB_SECRET_ARN y DB_DATABASES."
  type        = bool
  default     = true
}

variable "valkey_access" {
  description = "Usa su usuario Valkey (prefijo <servicio>:). Requiere el servicio en valkey_services del stack data."
  type        = bool
  default     = true
}

variable "files_access" {
  description = "Lectura y escritura en el bucket de archivos de usuarios."
  type        = bool
  default     = false
}

variable "ses_send" {
  description = "Permiso para enviar correo por SES."
  type        = bool
  default     = false
}

variable "environment_variables" {
  description = "Variables de entorno propias del servicio."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secretos propios: nombre de variable a valueFrom (ARN de Secrets Manager, con clave JSON opcional)."
  type        = map(string)
  default     = {}
}

variable "secrets_kms_key_arns" {
  description = "CMK de los secretos propios."
  type        = list(string)
  default     = []
}

variable "task_policies" {
  description = "Políticas IAM propias en línea (nombre a JSON) para todos los roles del servicio."
  type        = map(string)
  default     = {}
}

variable "lambda_runtime" {
  description = "Runtime de las funciones del servicio."
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_otel_layer_arn" {
  description = "Capa ADOT de las Lambdas. Confirma el ARN vigente de la región y la arquitectura. Null la desactiva."
  type        = string
  default     = null
}

variable "enable_execute_command" {
  description = "ECS Exec en las tareas Fargate del servicio. Queda auditado con la CMK del clúster."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Días de retención de los logs del servicio."
  type        = number
  default     = 30
}
