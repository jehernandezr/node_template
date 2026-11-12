variable "services" {
  description = <<-EOT
    Microservicios de la plataforma. Agregar uno es una entrada nueva en este mapa (clave = nombre del servicio).
    kind "fargate": API detrás del ALB (con path_patterns o host_headers) o worker (sin ellos, escala por cola con scale_on_queue).
    kind "lambda": consumidor de la cola indicada en queue (handler y paquete local o en S3).
    queue es el nombre de una cola de la topología de mensajería o "ses-events" (cola de eventos de SES).
    db_user y valkey_user deben existir en db_service_users y valkey_users.
    origin_verify en false deja al servicio accesible directo por el ALB sin el encabezado de CloudFront (Socket.IO y SSE).
  EOT
  type = map(object({
    kind = string

    # Fargate
    image                  = optional(string)
    command                = optional(list(string))
    container_port         = optional(number)
    cpu                    = optional(number, 512)
    memory                 = optional(number, 1024)
    cpu_architecture       = optional(string, "ARM64")
    spot                   = optional(bool, false)
    desired_count          = optional(number, 1)
    min_capacity           = optional(number, 1)
    max_capacity           = optional(number, 4)
    cpu_target_percent     = optional(number)
    memory_target_percent  = optional(number)
    path_patterns          = optional(list(string), [])
    host_headers           = optional(list(string), [])
    listener_rule_priority = optional(number)
    health_check_path      = optional(string, "/health")
    origin_verify          = optional(bool, true)
    scale_on_queue = optional(object({
      scale_out_threshold = optional(number, 1)
      messages_per_task   = optional(number, 100)
      steps               = optional(number, 5)
      scale_in_periods    = optional(number, 10)
    }))
    enable_execute_command = optional(bool, false)

    # Lambda
    handler                         = optional(string)
    runtime                         = optional(string, "nodejs22.x")
    filename                        = optional(string)
    s3_bucket                       = optional(string)
    s3_key                          = optional(string)
    s3_object_version               = optional(string)
    source_code_hash                = optional(string)
    memory_size                     = optional(number, 512)
    timeout                         = optional(number, 30)
    batch_size                      = optional(number, 10)
    maximum_batching_window_seconds = optional(number, 0)
    maximum_concurrency             = optional(number, 5)
    reserved_concurrent_executions  = optional(number)
    filter_patterns                 = optional(list(string), [])
    vpc_enabled                     = optional(bool, true)
    otel_layer_arn                  = optional(string)

    # Comunes
    queue                 = optional(string)
    send_queues           = optional(list(string), [])
    publish_topics        = optional(list(string), [])
    db_user               = optional(string)
    valkey_user           = optional(string)
    files_access          = optional(bool, false)
    ses_send              = optional(bool, false)
    environment_variables = optional(map(string), {})
    secrets               = optional(map(string), {})
    secrets_kms_key_arns  = optional(list(string), [])
    task_policies         = optional(map(string), {})
  }))
  default = {}

  validation {
    condition     = alltrue([for k, s in var.services : contains(["fargate", "lambda"], s.kind)])
    error_message = "kind debe ser fargate o lambda."
  }

  validation {
    condition     = alltrue([for k, s in var.services : s.kind != "fargate" || s.image != null])
    error_message = "Un servicio fargate requiere image."
  }

  validation {
    condition = alltrue([
      for k, s in var.services : s.kind != "lambda" || (
        s.queue != null && s.handler != null && (s.filename != null || (s.s3_bucket != null && s.s3_key != null))
      )
    ])
    error_message = "Un servicio lambda requiere queue, handler y filename (o s3_bucket con s3_key)."
  }

  validation {
    condition     = alltrue([for k, s in var.services : s.scale_on_queue == null || (s.kind == "fargate" && s.queue != null)])
    error_message = "scale_on_queue solo aplica a servicios fargate con queue."
  }
}

variable "lambda_otel_layer_arn" {
  description = "ARN de la capa ADOT para las Lambdas. Confirma el ARN vigente de tu región y arquitectura. Null desactiva la capa salvo que el servicio indique la suya."
  type        = string
  default     = null
}

variable "force_destroy_buckets" {
  description = "Permite borrar buckets con contenido (logs del ALB, web, archivos, almacenamiento de OpenObserve). Solo para entornos desechables."
  type        = bool
  default     = false
}
