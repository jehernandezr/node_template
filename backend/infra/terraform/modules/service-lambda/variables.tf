variable "name_prefix" {
  description = "Prefijo de nombres compartido con la plataforma, por ejemplo nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "function_name" {
  description = "Nombre corto de la función, por ejemplo billing-invoices. El nombre final es <name_prefix>-<function_name>."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}[a-z0-9]$", var.function_name))
    error_message = "function_name debe usar minúsculas, números y guiones, y tener entre 3 y 32 caracteres."
  }
}

variable "description" {
  description = "Descripción de la función."
  type        = string
  default     = null
}

variable "environment" {
  description = "Entorno (dev, staging o prod). Se publica como deployment.environment en OpenTelemetry."
  type        = string
}

variable "handler" {
  description = "Handler de la función, por ejemplo lambda.handler."
  type        = string
}

variable "runtime" {
  description = "Runtime de Lambda."
  type        = string
  default     = "nodejs22.x"
}

variable "filename" {
  description = "Ruta local del zip del bundle. Usa filename o s3_bucket con s3_key, no ambos."
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "Bucket S3 con el zip del bundle."
  type        = string
  default     = null
}

variable "s3_key" {
  description = "Clave S3 del zip del bundle."
  type        = string
  default     = null
}

variable "s3_object_version" {
  description = "Versión del objeto S3 del bundle."
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Hash base64 SHA256 del zip, para que Terraform detecte cambios del código."
  type        = string
  default     = null
}

variable "memory_size" {
  description = "Memoria en MB."
  type        = number
  default     = 512

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "memory_size debe estar entre 128 y 10240."
  }
}

variable "timeout" {
  description = "Tiempo máximo de ejecución en segundos. La visibilidad de la cola de origen debe ser al menos 6 veces este valor."
  type        = number
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "timeout debe estar entre 1 y 900."
  }
}

variable "environment_variables" {
  description = "Variables de entorno de la función, sin secretos. Se cifran con la clave KMS del módulo."
  type        = map(string)
  default     = {}
}

variable "secret_arns" {
  description = "ARN de los secretos de Secrets Manager que la función puede leer."
  type        = list(string)
  default     = []
}

variable "secrets_kms_key_arns" {
  description = "Claves KMS que cifran esos secretos."
  type        = list(string)
  default     = []
}

variable "reserved_concurrent_executions" {
  description = "Concurrencia reservada. Protege la base de datos de un pico y evita que la función consuma toda la cuenta. Null no reserva."
  type        = number
  default     = null
}

variable "layers" {
  description = "ARN de capas adicionales."
  type        = list(string)
  default     = []
}

variable "otel_layer_arn" {
  description = "ARN de la capa ADOT de OpenTelemetry para esta región y arquitectura arm64. Null desactiva OpenTelemetry."
  type        = string
  default     = null
}

variable "otel_collector_config_uri" {
  description = "Ubicación de la configuración del collector de la capa, por ejemplo /var/task/collector.yaml, que reenvía a OpenObserve. Null usa la de la capa."
  type        = string
  default     = null
}

variable "tracing_mode" {
  description = "Trazado de X-Ray: Active o PassThrough."
  type        = string
  default     = "Active"

  validation {
    condition     = contains(["Active", "PassThrough"], var.tracing_mode)
    error_message = "tracing_mode debe ser Active o PassThrough."
  }
}

variable "application_log_level" {
  description = "Nivel de log de la aplicación en logging_config. También alimenta LOG_LEVEL."
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"], var.application_log_level)
    error_message = "application_log_level debe ser TRACE, DEBUG, INFO, WARN, ERROR o FATAL."
  }
}

variable "log_retention_days" {
  description = "Días de retención del log group."
  type        = number
  default     = 30
}

variable "vpc_enabled" {
  description = "Ejecuta la función dentro de la VPC (para llegar a RDS Proxy o Valkey). Requiere vpc_id y subnet_ids."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "ID de la VPC. Requerido con vpc_enabled."
  type        = string
  default     = null
}

variable "additional_security_group_ids" {
  description = "Security groups extra de la función. El de clientes de datos (stack data) abre la salida hacia RDS Proxy, las réplicas, Valkey y OpenObserve; el de la función solo sale por HTTPS."
  type        = list(string)
  default     = []
}

variable "subnet_ids" {
  description = "Subredes privadas de la función. Requerido con vpc_enabled."
  type        = list(string)
  default     = []
}

variable "queue_arn" {
  description = "ARN de la cola SQS de origen. Su DLQ y su redrive los define el módulo messaging. Null para una función sin cola, por ejemplo la API detrás de API Gateway."
  type        = string
  default     = null
}

variable "queue_kms_key_arn" {
  description = "Clave KMS de la cola de origen, para descifrar sus mensajes. Null si la cola no usa una CMK."
  type        = string
  default     = null
}

variable "batch_size" {
  description = "Mensajes por invocación. Hasta 10 en FIFO y 10000 en colas estándar con ventana de agrupación."
  type        = number
  default     = 10

  validation {
    condition     = var.batch_size >= 1 && var.batch_size <= 10000
    error_message = "batch_size debe estar entre 1 y 10000."
  }
}

variable "maximum_batching_window_seconds" {
  description = "Segundos que Lambda espera para completar un lote. Entre 0 y 300."
  type        = number
  default     = 0

  validation {
    condition     = var.maximum_batching_window_seconds >= 0 && var.maximum_batching_window_seconds <= 300
    error_message = "maximum_batching_window_seconds debe estar entre 0 y 300."
  }
}

variable "maximum_concurrency" {
  description = "Invocaciones simultáneas máximas desde esta cola. Entre 2 y 1000. Null no limita."
  type        = number
  default     = 5

  validation {
    condition     = var.maximum_concurrency == null || (coalesce(var.maximum_concurrency, 2) >= 2 && coalesce(var.maximum_concurrency, 2) <= 1000)
    error_message = "maximum_concurrency debe estar entre 2 y 1000."
  }
}

variable "filter_patterns" {
  description = "Patrones de filtro de eventos de SQS en JSON. Vacío entrega todos los mensajes."
  type        = list(string)
  default     = []
}

variable "event_source_enabled" {
  description = "Habilita el mapeo de la cola. Desactívalo para pausar el consumo."
  type        = bool
  default     = true
}

variable "async_dlq_retention_seconds" {
  description = "Retención de la cola de mensajes fallidos de invocaciones asíncronas."
  type        = number
  default     = 1209600
}

variable "task_policies" {
  description = "Políticas IAM en línea del rol: nombre a documento JSON. Aquí van los permisos de S3, SES, SNS y demás."
  type        = map(string)
  default     = {}
}

variable "alarm_topic_arn" {
  description = "ARN de un tópico SNS para las alarmas de errores y de la DLQ. Si es null, las alarmas no notifican."
  type        = string
  default     = null
}

variable "kms_key_arn" {
  description = "Clave KMS existente para variables de entorno, logs y la DLQ. Debe permitir a logs.<región>.amazonaws.com y a SQS. Si es null, el módulo crea la suya."
  type        = string
  default     = null
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
