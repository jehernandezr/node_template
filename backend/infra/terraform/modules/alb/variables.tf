variable "name_prefix" {
  description = "Prefijo para los nombres del balanceador y sus recursos. Máximo 22 caracteres."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "name" {
  description = "Sufijo del balanceador, para tener varios en la misma raíz (por ejemplo alb y api). Máximo 9 caracteres."
  type        = string
  default     = "alb"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,8}$", var.name))
    error_message = "name usa minúsculas, números y guiones, empieza por letra y tiene hasta 9 caracteres."
  }
}

variable "internal" {
  description = "true crea un ALB interno, alcanzable solo dentro de la VPC (por ejemplo detrás del VPC link de API Gateway)."
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "ID de la VPC del balanceador."
  type        = string
}

variable "subnet_ids" {
  description = "Subredes del balanceador, en al menos dos zonas: públicas si es internet-facing, privadas si es interno."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "Un ALB necesita al menos dos subredes."
  }
}

variable "certificate_arn" {
  description = "ARN del certificado ACM del listener HTTPS, en la región del balanceador. Null solo en un ALB interno: escucha en HTTP dentro de la VPC."
  type        = string
  default     = null
}

variable "additional_certificate_arns" {
  description = "Certificados ACM adicionales para el listener HTTPS (SNI)."
  type        = list(string)
  default     = []
}

variable "ssl_policy" {
  description = "Política TLS del listener HTTPS."
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-Res-2021-06"
}

variable "idle_timeout_seconds" {
  description = "Tiempo de inactividad de las conexiones. Socket.IO y SSE mantienen conexiones largas, así que el valor por defecto es alto. Entre 1 y 4000."
  type        = number
  default     = 3600

  validation {
    condition     = var.idle_timeout_seconds >= 1 && var.idle_timeout_seconds <= 4000
    error_message = "idle_timeout_seconds debe estar entre 1 y 4000."
  }
}

variable "ingress_cidr_blocks" {
  description = "CIDR IPv4 que pueden llegar al balanceador por 80 y 443. Usa ingress_prefix_list_ids para limitarlo a CloudFront."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ingress_ipv6_cidr_blocks" {
  description = "CIDR IPv6 que pueden llegar al balanceador por 80 y 443."
  type        = list(string)
  default     = ["::/0"]
}

variable "ingress_prefix_list_ids" {
  description = "Prefix lists que pueden llegar al balanceador, por ejemplo la administrada com.amazonaws.global.cloudfront.origin-facing."
  type        = list(string)
  default     = []
}

variable "ingress_security_group_ids" {
  description = "Security groups que pueden llegar al listener, por ejemplo el del VPC link de API Gateway."
  type        = list(string)
  default     = []
}

variable "deletion_protection" {
  description = "Protege el balanceador contra borrado. Desactívala solo en entornos desechables."
  type        = bool
  default     = true
}

variable "drop_invalid_header_fields" {
  description = "Descarta cabeceras HTTP inválidas antes de reenviar."
  type        = bool
  default     = true
}

variable "access_logs_retention_days" {
  description = "Días que se conservan los access logs en S3."
  type        = number
  default     = 90

  validation {
    condition     = var.access_logs_retention_days >= 1
    error_message = "access_logs_retention_days debe ser al menos 1."
  }
}

variable "access_logs_force_destroy" {
  description = "Permite borrar el bucket de access logs aunque tenga objetos."
  type        = bool
  default     = false
}

variable "target_groups" {
  description = "Target groups sin sesiones pegajosas, por clave. Los servicios de service-fargate crean el suyo; usa esto para destinos compartidos. default_action_key elige el que atiende el tráfico sin regla."
  type = map(object({
    port                      = number
    protocol                  = optional(string, "HTTP")
    target_type               = optional(string, "ip")
    health_check_path         = optional(string, "/health")
    health_check_matcher      = optional(string, "200-399")
    deregistration_delay      = optional(number, 30)
    slow_start                = optional(number, 0)
    load_balancing_cross_zone = optional(string, "use_load_balancer_configuration")
  }))
  default = {}
}

variable "default_target_group_key" {
  description = "Clave de target_groups que recibe el tráfico sin regla. Si es null, el listener responde 404."
  type        = string
  default     = null

  validation {
    condition     = var.default_target_group_key == null || contains(keys(var.target_groups), coalesce(var.default_target_group_key, "-"))
    error_message = "default_target_group_key debe existir en target_groups."
  }
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
