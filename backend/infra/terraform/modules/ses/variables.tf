variable "name_prefix" {
  description = "Prefix for the topic, key and configuration set names."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "domain" {
  description = "Domain that sends email, for example example.com."
  type        = string

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain))
    error_message = "domain must be a lowercase domain, for example example.com."
  }
}

variable "mail_from_subdomain" {
  description = "Custom MAIL FROM subdomain. Aligns SPF with the domain for DMARC."
  type        = string
  default     = "mail"
}

variable "route53_zone_id" {
  description = "Route 53 zone of the domain. If set, the module creates the DKIM, MAIL FROM, SPF and DMARC records. If null, use the dns_records output."
  type        = string
  default     = null
}

variable "dmarc_policy" {
  description = "DMARC policy: none, quarantine or reject. Start with none and tighten it based on the reports."
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.dmarc_policy)
    error_message = "dmarc_policy must be none, quarantine or reject."
  }
}

variable "dmarc_report_email" {
  description = "Email address that receives the DMARC aggregate reports (rua). Null omits the tag."
  type        = string
  default     = null
}

variable "tracked_event_types" {
  description = "Events that the tracked configuration set sends to the SNS topic."
  type        = list(string)
  default     = ["DELIVERY", "BOUNCE", "COMPLAINT", "OPEN", "CLICK"]

  validation {
    condition = alltrue([
      for e in var.tracked_event_types :
      contains(["SEND", "REJECT", "BOUNCE", "COMPLAINT", "DELIVERY", "OPEN", "CLICK", "RENDERING_FAILURE", "DELIVERY_DELAY", "SUBSCRIPTION"], e)
    ])
    error_message = "tracked_event_types contains an invalid SES event type."
  }
}

variable "tracking_redirect_domain" {
  description = "Custom domain for the click and open tracking links. Null uses the SES domain."
  type        = string
  default     = null
}

variable "events_topic_display_name" {
  description = "Display name of the events SNS topic."
  type        = string
  default     = "SES events for email tracking"
}

variable "suppressed_reasons" {
  description = "Reasons for which SES automatically suppresses addresses."
  type        = list(string)
  default     = ["BOUNCE", "COMPLAINT"]

  validation {
    condition     = alltrue([for r in var.suppressed_reasons : contains(["BOUNCE", "COMPLAINT"], r)])
    error_message = "suppressed_reasons accepts BOUNCE and COMPLAINT."
  }
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
