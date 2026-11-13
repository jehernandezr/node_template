variable "compute_enabled" {
  description = "Crea el clúster ECS, OpenObserve, la API HTTP y los ALB, y lee el stack network. false en el ambiente local: LocalStack solo emula archivos, correo y alarmas."
  type        = bool
  default     = true
}

# --- Alarmas y costos ------------------------------------------------------------

variable "alarm_email" {
  description = "Correo que recibe alarmas y avisos de costo. Crea un tópico SNS cifrado y la suscripción (el destinatario debe confirmarla). En staging y prod se requiere este valor o alarm_topic_arn."
  type        = string
  default     = null

  validation {
    condition = var.alarm_email == null || !contains(["staging", "prod"], var.environment) || (
      !strcontains(upper(var.alarm_email), "REEMPLAZAR") && !endswith(lower(var.alarm_email), "example.com")
    )
    error_message = "En staging y prod alarm_email debe ser un buzón real, no un valor de ejemplo (REEMPLAZAR o example.com)."
  }
}

variable "alarm_topic_arn" {
  description = "ARN de un tópico SNS existente para alarmas y avisos de costo. Se ignora si defines alarm_email."
  type        = string
  default     = null
}

variable "monthly_budget" {
  description = "Presupuesto mensual del ambiente en budget_currency. Avisa al tópico de alarmas al 80 % y al 100 % real y al 100 % pronosticado. Null no crea presupuesto."
  type        = number
  default     = null
}

variable "budget_currency" {
  description = "Moneda del presupuesto."
  type        = string
  default     = "USD"
}

variable "budget_cost_filter_tags" {
  description = "Etiquetas de asignación de costos (activadas en Billing) que filtran el presupuesto, por ejemplo { Environment = \"prod\" }. Vacío cuenta toda la cuenta."
  type        = map(string)
  default     = {}
}

# --- API HTTP y balanceadores ---------------------------------------------------

variable "fargate_api_enabled" {
  description = "Crea el VPC link y el ALB interno para los servicios cuya API corre en Fargate. No hace falta si todas las APIs son Lambda."
  type        = bool
  default     = false
}

variable "api_throttling_burst_limit" {
  description = "Ráfaga máxima de peticiones de la API HTTP."
  type        = number
  default     = 500
}

variable "api_throttling_rate_limit" {
  description = "Peticiones por segundo sostenidas de la API HTTP."
  type        = number
  default     = 1000
}

variable "realtime_alb_certificate_arn" {
  description = "Certificado ACM regional del ALB público de tiempo real (Socket.IO y SSE). Null no crea el ALB."
  type        = string
  default     = null
}

variable "alb_idle_timeout_seconds" {
  description = "Tiempo de inactividad del ALB de tiempo real. Mayor que el intervalo de ping de Socket.IO y SSE."
  type        = number
  default     = 3600
}

variable "alb_deletion_protection" {
  description = "Protección contra borrado de los ALB (tiempo real, API interna y OpenObserve)."
  type        = bool
  default     = true
}

# --- Observabilidad -------------------------------------------------------------

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

# --- Archivos y correo -------------------------------------------------------------

variable "files_cors_allowed_origins" {
  description = "Orígenes CORS del bucket de archivos de usuarios, por ejemplo https://app.example.com. Sin orígenes no se crea el bucket."
  type        = list(string)
  default     = []
}

variable "ses_domain" {
  description = "Dominio remitente de SES. Null no crea SES ni la cola de eventos de correo (stack messaging)."
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

variable "route53_zone_id" {
  description = "Zona de Route 53 para los registros de SES. Null los deja sin crear: publícalos tú (salida ses_dns_records)."
  type        = string
  default     = null
}

# --- Comunes --------------------------------------------------------------------

variable "log_retention_days" {
  description = "Días de retención de los logs de la API HTTP y su autorizador."
  type        = number
  default     = 30
}

variable "secret_recovery_window_days" {
  description = "Días de recuperación de un secreto borrado. 0 lo borra de inmediato (solo desechables)."
  type        = number
  default     = 30
}

variable "force_destroy_buckets" {
  description = "Permite borrar buckets con contenido (logs de ALB, archivos, OpenObserve). Solo para ambientes desechables."
  type        = bool
  default     = false
}
