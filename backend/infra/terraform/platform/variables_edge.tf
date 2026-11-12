variable "alb_certificate_arn" {
  description = "Certificado ACM regional del ALB público. Null no crea el ALB (sin servicios con tráfico entrante)."
  type        = string
  default     = null
}

variable "alb_hostname" {
  description = "Nombre DNS del ALB público: origen de CloudFront para la API y entrada directa de Socket.IO y SSE. Debe estar cubierto por alb_certificate_arn. Con route53_zone_id se crea el registro."
  type        = string
  default     = null
}

variable "alb_idle_timeout_seconds" {
  description = "Tiempo de inactividad del ALB. Mayor que el intervalo de ping de Socket.IO y SSE."
  type        = number
  default     = 3600
}

variable "alb_deletion_protection" {
  description = "Protección contra borrado de los ALB (público e interno de OpenObserve)."
  type        = bool
  default     = true
}

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

variable "origin_verify_header_value" {
  description = "Valor del encabezado X-Origin-Verify que CloudFront envía al ALB. Null genera uno aleatorio (queda en el estado)."
  type        = string
  default     = null
  sensitive   = true
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

variable "route53_zone_id" {
  description = "Zona de Route 53 para los registros de CloudFront, el ALB y SES. Null los deja sin crear: publícalos tú."
  type        = string
  default     = null
}

variable "files_cors_allowed_origins" {
  description = "Orígenes CORS del bucket de archivos. Null los deriva de web_aliases (https). Sin orígenes no se crea el bucket."
  type        = list(string)
  default     = null
}

variable "ses_domain" {
  description = "Dominio remitente de SES. Null no crea SES ni la cola de eventos de correo."
  type        = string
  default     = null
}

variable "ses_dmarc_policy" {
  description = "Política DMARC: none, quarantine o reject. Empieza en none."
  type        = string
  default     = "none"
}

variable "ses_dmarc_report_email" {
  description = "Destino de los informes DMARC (rua)."
  type        = string
  default     = null
}

variable "observability_root_user_email" {
  description = "Correo del usuario raíz de OpenObserve. Null no despliega observabilidad y los servicios no exportan telemetría."
  type        = string
  default     = null
}

variable "observability_data_retention_days" {
  description = "Retención de la telemetría en OpenObserve."
  type        = number
  default     = 30
}
