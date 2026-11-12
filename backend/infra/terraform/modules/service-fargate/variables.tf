variable "name_prefix" {
  description = "Prefijo de nombres compartido con el clúster, por ejemplo nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "service_name" {
  description = "Nombre corto del servicio, por ejemplo reports o realtime."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.service_name))
    error_message = "service_name debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "environment" {
  description = "Entorno (dev, staging o prod). Se publica como deployment.environment en OpenTelemetry."
  type        = string
}

variable "cluster_arn" {
  description = "ARN del clúster ECS."
  type        = string
}

variable "cluster_name" {
  description = "Nombre del clúster ECS, para autoescalado y métricas."
  type        = string
}

variable "vpc_id" {
  description = "ID de la VPC."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR de la VPC. El servicio puede salir a cualquier puerto TCP dentro de ella (RDS Proxy, Valkey, endpoints)."
  type        = string
}

variable "subnet_ids" {
  description = "Subredes privadas donde corren las tareas."
  type        = list(string)
}

variable "image" {
  description = "Imagen del contenedor con su etiqueta o digest, por ejemplo <cuenta>.dkr.ecr.<región>.amazonaws.com/reports:1.2.3."
  type        = string
}

variable "command" {
  description = "Comando del contenedor. Null usa el de la imagen. Un mismo servicio puede correr su worker con otro comando."
  type        = list(string)
  default     = null
}

variable "container_port" {
  description = "Puerto del contenedor. Null para workers sin tráfico entrante."
  type        = number
  default     = null
}

variable "cpu" {
  description = "Unidades de CPU de la tarea (256, 512, 1024, 2048, 4096, 8192 o 16384)."
  type        = number
  default     = 512

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096, 8192, 16384], var.cpu)
    error_message = "cpu debe ser 256, 512, 1024, 2048, 4096, 8192 o 16384."
  }
}

variable "memory" {
  description = "Memoria de la tarea en MiB. Debe ser una combinación válida de Fargate para cpu."
  type        = number
  default     = 1024
}

variable "cpu_architecture" {
  description = "Arquitectura de la tarea: ARM64 o X86_64."
  type        = string
  default     = "ARM64"

  validation {
    condition     = contains(["ARM64", "X86_64"], var.cpu_architecture)
    error_message = "cpu_architecture debe ser ARM64 o X86_64."
  }
}

variable "desired_count" {
  description = "Tareas iniciales. El autoescalado las ajusta y Terraform no las revierte."
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Mínimo de tareas del autoescalado. 0 para workers que escalan por cola."
  type        = number
  default     = 1

  validation {
    condition     = var.min_capacity >= 0
    error_message = "min_capacity no puede ser negativo."
  }
}

variable "max_capacity" {
  description = "Máximo de tareas del autoescalado."
  type        = number
  default     = 4

  validation {
    condition     = var.max_capacity >= 1
    error_message = "max_capacity debe ser al menos 1."
  }
}

variable "capacity_provider_strategy" {
  description = "Estrategia de capacity providers del servicio. Usa FARGATE_SPOT solo para workers tolerantes a interrupciones."
  type = list(object({
    capacity_provider = string
    weight            = number
    base              = optional(number, 0)
  }))
  default = [{ capacity_provider = "FARGATE", weight = 1, base = 0 }]

  validation {
    condition     = alltrue([for s in var.capacity_provider_strategy : contains(["FARGATE", "FARGATE_SPOT"], s.capacity_provider)])
    error_message = "capacity_provider debe ser FARGATE o FARGATE_SPOT."
  }
}

variable "environment_variables" {
  description = "Variables de entorno de la aplicación, sin secretos."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secretos como variable de entorno: nombre de la variable a ARN de Secrets Manager, con clave JSON opcional (arn:...:secret:nombre-xxxxxx:CLAVE::)."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for v in values(var.secrets) : can(regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v))])
    error_message = "Cada valor de secrets debe ser un ARN de Secrets Manager."
  }
}

variable "secrets_kms_key_arns" {
  description = "Claves KMS que cifran los secretos, para que el rol de ejecución pueda descifrarlos."
  type        = list(string)
  default     = []
}

variable "otlp_endpoint" {
  description = "Endpoint OTLP HTTP base de OpenObserve (salida otlp_http_endpoint del módulo observability). Null desactiva OpenTelemetry."
  type        = string
  default     = null
}

variable "otlp_authorization_secret" {
  description = "Secreto con la cabecera Authorization del OTLP, como valueFrom (salida otlp_authorization_value_from de observability)."
  type        = string
  default     = null
}

variable "otel_collector_sidecar" {
  description = "Corre el collector ADOT como sidecar. La aplicación exporta a localhost y el collector reenvía a OpenObserve. Si es false, la aplicación exporta directo al endpoint."
  type        = bool
  default     = true
}

variable "otel_collector_image" {
  description = "Imagen del collector ADOT del sidecar. Fija una versión revisada."
  type        = string
  default     = "public.ecr.aws/aws-observability/aws-otel-collector:v0.43.1"
}

variable "enable_load_balancer" {
  description = "Conecta el servicio a un ALB con target group y regla de listener. Requiere container_port."
  type        = bool
  default     = false
}

variable "alb_listener_arn" {
  description = "ARN del listener HTTPS del ALB, donde se crea la regla. Requerido con enable_load_balancer."
  type        = string
  default     = null
}

variable "alb_security_group_id" {
  description = "Security group del ALB. El módulo agrega su salida hacia el servicio. Requerido con enable_load_balancer."
  type        = string
  default     = null
}

variable "listener_rule_priority" {
  description = "Prioridad de la regla del listener. Única por listener."
  type        = number
  default     = 100
}

variable "path_patterns" {
  description = "Patrones de ruta que enrutan al servicio, por ejemplo [\"/realtime/*\"]."
  type        = list(string)
  default     = []
}

variable "host_headers" {
  description = "Hosts que enrutan al servicio, por ejemplo [\"realtime.example.com\"]."
  type        = list(string)
  default     = []
}

variable "health_check_path" {
  description = "Ruta del health check del target group."
  type        = string
  default     = "/health"
}

variable "health_check_grace_period_seconds" {
  description = "Segundos de gracia antes de que el health check del ALB cuente contra una tarea nueva."
  type        = number
  default     = 60
}

variable "deregistration_delay_seconds" {
  description = "Segundos que el ALB espera al drenar conexiones. Súbelo para conexiones largas de WebSocket y SSE."
  type        = number
  default     = 60
}

variable "stop_timeout_seconds" {
  description = "Segundos entre SIGTERM y SIGKILL del contenedor. Máximo 120."
  type        = number
  default     = 30

  validation {
    condition     = var.stop_timeout_seconds >= 2 && var.stop_timeout_seconds <= 120
    error_message = "stop_timeout_seconds debe estar entre 2 y 120."
  }
}

variable "container_health_check_command" {
  description = "Comando de health check del contenedor, por ejemplo [\"CMD-SHELL\", \"curl -f http://localhost:3000/health || exit 1\"]. Null no lo define."
  type        = list(string)
  default     = null
}

variable "cpu_target_percent" {
  description = "Objetivo de CPU media del autoescalado. Null desactiva esta política."
  type        = number
  default     = 60

  validation {
    condition     = var.cpu_target_percent == null || (coalesce(var.cpu_target_percent, 50) > 0 && coalesce(var.cpu_target_percent, 50) < 100)
    error_message = "cpu_target_percent debe estar entre 1 y 99."
  }
}

variable "memory_target_percent" {
  description = "Objetivo de memoria media del autoescalado. Null desactiva esta política."
  type        = number
  default     = null
}

variable "sqs_scaling" {
  description = "Autoescalado por profundidad de cola: sube tareas según los mensajes visibles (messages_per_task por tarea, hasta steps escalones) y baja a min_capacity cuando la cola y los mensajes en proceso llegan a cero. Combínalo con cpu_target_percent = null en workers."
  type = object({
    queue_name          = string
    scale_out_threshold = optional(number, 1)
    messages_per_task   = optional(number, 100)
    steps               = optional(number, 5)
    scale_in_periods    = optional(number, 10)
  })
  default = null

  validation {
    condition     = var.sqs_scaling == null || (try(var.sqs_scaling.steps, 2) >= 2 && try(var.sqs_scaling.messages_per_task, 1) >= 1)
    error_message = "sqs_scaling.steps debe ser al menos 2 y messages_per_task al menos 1."
  }
}

variable "task_policies" {
  description = "Políticas IAM en línea del rol de la tarea: nombre a documento JSON. Aquí van los permisos de SQS, S3, SES y demás."
  type        = map(string)
  default     = {}
}

variable "enable_execute_command" {
  description = "Habilita ECS Exec para depurar. Las sesiones se registran con la clave y el log group del clúster."
  type        = bool
  default     = false
}

variable "exec_kms_key_arn" {
  description = "Clave KMS del clúster (salida kms_key_arn de ecs-cluster), para que la tarea abra sesiones de ECS Exec."
  type        = string
  default     = null
}

variable "exec_log_group_arn" {
  description = "ARN del log group de ECS Exec del clúster. Si es null, el rol puede escribir en cualquier log group de /ecs/."
  type        = string
  default     = null
}

variable "readonly_root_filesystem" {
  description = "Monta el sistema de archivos raíz del contenedor de solo lectura."
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Días de retención del log group del servicio."
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "Clave KMS del log group. Debe permitir a logs.<región>.amazonaws.com sobre /ecs/<name_prefix>/*; la de ecs-cluster sirve. Si es null, el módulo crea la suya."
  type        = string
  default     = null
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
