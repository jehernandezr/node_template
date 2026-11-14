variable "name_prefix" {
  description = "Prefijo de nombres, compartido con el clúster, por ejemplo nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "vpc_id" {
  description = "ID de la VPC."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR de la VPC. Las tareas salen por TCP dentro de ella (EFS) y el ALB interno acepta clientes de este rango."
  type        = string
}

variable "subnet_ids" {
  description = "Subredes privadas para las tareas, EFS y el ALB interno, en al menos dos zonas."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "Se necesitan al menos dos subredes."
  }
}

variable "cluster_arn" {
  description = "ARN del clúster ECS."
  type        = string
}

variable "create_internal_alb" {
  description = "true crea un ALB interno solo para OpenObserve. false usa un listener existente con alb_listener_arn."
  type        = bool
  default     = true
}

variable "internal_alb_certificate_arn" {
  description = "Certificado ACM del ALB interno. Si es null, el listener es HTTP en el puerto 80 y solo debe usarse dentro de la VPC."
  type        = string
  default     = null
}

variable "internal_alb_client_cidr_blocks" {
  description = "CIDR que llegan al ALB interno: los servicios que envían telemetría y los equipos que consultan la interfaz. Por defecto, la VPC."
  type        = list(string)
  default     = []
}

variable "internal_alb_deletion_protection" {
  description = "Protege el ALB interno contra borrado."
  type        = bool
  default     = true
}

variable "alb_listener_arn" {
  description = "ARN del listener HTTPS de un ALB existente. Requerido con create_internal_alb = false."
  type        = string
  default     = null
}

variable "alb_security_group_id" {
  description = "Security group del ALB existente. El módulo agrega su salida hacia OpenObserve. Requerido con create_internal_alb = false."
  type        = string
  default     = null
}

variable "alb_dns_name" {
  description = "Nombre DNS del ALB existente. Se usa para el endpoint si no hay host_headers."
  type        = string
  default     = null
}

variable "listener_rule_priority" {
  description = "Prioridad de la regla del listener existente."
  type        = number
  default     = 50
}

variable "host_headers" {
  description = "Hosts que enrutan a OpenObserve, por ejemplo [\"observability.example.com\"]. Requerido con un listener existente."
  type        = list(string)
  default     = []
}

variable "public_hostname" {
  description = "Nombre DNS con el que los clientes alcanzan OpenObserve, si apuntas un registro propio al ALB. Null usa host_headers o el DNS del ALB."
  type        = string
  default     = null
}

variable "organization" {
  description = "Organización de OpenObserve en la ruta de ingesta OTLP (/api/<organización>/...)."
  type        = string
  default     = "default"
}

variable "root_user_email" {
  description = "Correo del usuario raíz de OpenObserve."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.root_user_email))
    error_message = "root_user_email debe ser un correo válido."
  }
}

variable "image" {
  description = "Imagen de OpenObserve. Fija una versión revisada; no uses latest."
  type        = string
  default     = "public.ecr.aws/zinclabs/openobserve:v0.14.7"
}

variable "cpu" {
  description = "Unidades de CPU de la tarea."
  type        = number
  default     = 1024

  validation {
    condition     = contains([512, 1024, 2048, 4096], var.cpu)
    error_message = "cpu debe ser 512, 1024, 2048 o 4096."
  }
}

variable "memory" {
  description = "Memoria de la tarea en MiB. Debe ser una combinación válida de Fargate para cpu."
  type        = number
  default     = 4096
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

variable "data_retention_days" {
  description = "Días que OpenObserve conserva los datos antes de compactarlos y borrarlos."
  type        = number
  default     = 30

  validation {
    condition     = var.data_retention_days >= 1
    error_message = "data_retention_days debe ser al menos 1."
  }
}

variable "secret_recovery_window_days" {
  description = "Días de recuperación del secreto al borrarlo. 0 lo borra sin espera."
  type        = number
  default     = 7

  validation {
    condition     = var.secret_recovery_window_days == 0 || (var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30)
    error_message = "secret_recovery_window_days debe ser 0 o estar entre 7 y 30."
  }
}

variable "log_retention_days" {
  description = "Días de retención del log group de OpenObserve."
  type        = number
  default     = 30
}

variable "storage_force_destroy" {
  description = "Permite borrar el bucket de almacenamiento aunque tenga datos. Solo para entornos desechables."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
