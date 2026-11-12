variable "name_prefix" {
  description = "Prefijo para los nombres de tópicos, colas y DLQs."
  type        = string
}

variable "topology_file" {
  description = "Ruta absoluta al JSON de la topología exportado por backend/libs/platform/messaging."
  type        = string
}

variable "kms_data_key_reuse_period_seconds" {
  description = "Segundos que SQS reutiliza una clave de datos KMS. Entre 60 y 86400."
  type        = number
  default     = 300

  validation {
    condition     = var.kms_data_key_reuse_period_seconds >= 60 && var.kms_data_key_reuse_period_seconds <= 86400
    error_message = "kms_data_key_reuse_period_seconds debe estar entre 60 y 86400."
  }
}

variable "alarm_topic_arn" {
  description = "ARN de un tópico SNS para las alarmas de DLQ. Si es null, las alarmas no notifican."
  type        = string
  default     = null
}

variable "max_receive_count" {
  description = "Recepciones antes de mover un mensaje a la DLQ. Si es null se usa el maxReceiveCount de cada cola en la topología."
  type        = number
  default     = null

  validation {
    condition     = var.max_receive_count == null || (var.max_receive_count >= 1 && var.max_receive_count <= 1000)
    error_message = "max_receive_count debe estar entre 1 y 1000."
  }
}

variable "dlq_oldest_message_age_seconds" {
  description = "Edad en segundos del mensaje más viejo de una DLQ que dispara la alarma."
  type        = number
  default     = 3600
}

variable "queue_oldest_message_age_seconds" {
  description = "Edad en segundos del mensaje más viejo de una cola principal que dispara la alarma (consumidor detenido)."
  type        = number
  default     = 900
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
