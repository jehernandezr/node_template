variable "name_prefix" {
  description = "Prefijo para los nombres del tópico, la clave y los configuration sets."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "domain" {
  description = "Dominio que envía correo, por ejemplo example.com."
  type        = string

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain))
    error_message = "domain debe ser un dominio en minúsculas, por ejemplo example.com."
  }
}

variable "mail_from_subdomain" {
  description = "Subdominio del MAIL FROM personalizado. Alinea SPF con el dominio para DMARC."
  type        = string
  default     = "mail"
}

variable "route53_zone_id" {
  description = "Zona Route 53 del dominio. Si se indica, el módulo crea los registros DKIM, MAIL FROM, SPF y DMARC. Si es null, usa la salida dns_records."
  type        = string
  default     = null
}

variable "dmarc_policy" {
  description = "Política DMARC: none, quarantine o reject. Empieza en none y endurece con los informes."
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.dmarc_policy)
    error_message = "dmarc_policy debe ser none, quarantine o reject."
  }
}

variable "dmarc_report_email" {
  description = "Correo que recibe los informes agregados de DMARC (rua). Null omite la etiqueta."
  type        = string
  default     = null
}

variable "tracked_event_types" {
  description = "Eventos que el configuration set con seguimiento envía al tópico SNS."
  type        = list(string)
  default     = ["DELIVERY", "BOUNCE", "COMPLAINT", "OPEN", "CLICK"]

  validation {
    condition = alltrue([
      for e in var.tracked_event_types :
      contains(["SEND", "REJECT", "BOUNCE", "COMPLAINT", "DELIVERY", "OPEN", "CLICK", "RENDERING_FAILURE", "DELIVERY_DELAY", "SUBSCRIPTION"], e)
    ])
    error_message = "tracked_event_types contiene un tipo de evento de SES no válido."
  }
}

variable "tracking_redirect_domain" {
  description = "Dominio propio para los enlaces de seguimiento de clics y aperturas. Null usa el de SES."
  type        = string
  default     = null
}

variable "events_topic_display_name" {
  description = "Nombre visible del tópico SNS de eventos."
  type        = string
  default     = "Eventos de SES para el seguimiento de correo"
}

variable "suppressed_reasons" {
  description = "Razones por las que SES suprime direcciones de forma automática."
  type        = list(string)
  default     = ["BOUNCE", "COMPLAINT"]

  validation {
    condition     = alltrue([for r in var.suppressed_reasons : contains(["BOUNCE", "COMPLAINT"], r)])
    error_message = "suppressed_reasons admite BOUNCE y COMPLAINT."
  }
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
