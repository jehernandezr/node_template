variable "cloudfront_certificate_arn" {
  description = "Certificado ACM en us-east-1 que cubre web_aliases y api_aliases. Null no crea CloudFront ni WAF."
  type        = string
  default     = null
}

variable "web_aliases" {
  description = "Dominios de la distribución de la web Flutter."
  type        = list(string)
  default     = []
}

variable "api_aliases" {
  description = "Dominios de la distribución de la API."
  type        = list(string)
  default     = []
}

variable "realtime_hostname" {
  description = "Nombre DNS del ALB de tiempo real. Debe estar cubierto por su certificado. Con route53_zone_id se crea el registro."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Zona de Route 53 para los registros de CloudFront y del ALB de tiempo real. Null los deja sin crear."
  type        = string
  default     = null
}

variable "waf_block_mode" {
  description = "false hace que el WAF solo cuente: úsalo para afinar reglas antes de bloquear."
  type        = bool
  default     = true
}

variable "content_security_policy" {
  description = "CSP de la web Flutter. Null no la envía."
  type        = string
  default     = null
}

variable "force_destroy_buckets" {
  description = "Permite borrar el bucket web con contenido. Solo para ambientes desechables."
  type        = bool
  default     = false
}
