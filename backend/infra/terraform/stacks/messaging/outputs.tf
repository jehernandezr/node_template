locals {
  ses_queue = local.ses == null ? {} : { "ses-events" = aws_sqs_queue.ses_events[0] }
}

output "topic_arns" {
  description = "ARN de cada tópico SNS, por nombre declarado en la topología."
  value       = module.messaging.topic_arns
}

output "queue_arns" {
  description = "ARN de cada cola SQS, por nombre declarado. Incluye ses-events cuando hay SES."
  value       = merge(module.messaging.queue_arns, { for k, q in local.ses_queue : k => q.arn })
}

output "queue_urls" {
  description = "URL de cada cola SQS, por nombre declarado. Incluye ses-events cuando hay SES."
  value       = merge(module.messaging.queue_urls, { for k, q in local.ses_queue : k => q.url })
}

output "queue_names" {
  description = "Nombre final de cada cola SQS, para métricas y escalado. Incluye ses-events cuando hay SES."
  value       = merge(module.messaging.queue_names, { for k, q in local.ses_queue : k => q.name })
}

output "dlq_arns" {
  description = "ARN de la DLQ de cada cola."
  value       = module.messaging.dlq_arns
}

output "service_access" {
  description = "Por servicio, los tópicos donde publica y las colas donde envía o consume, según la topología."
  value       = module.messaging.service_access
}

output "kms_key_arn" {
  description = "ARN de la clave KMS de tópicos y colas."
  value       = module.messaging.kms_key_arn
}

output "name_prefix" {
  description = "Prefijo de los nombres de tópicos y colas, para los adaptadores de mensajería."
  value       = var.name_prefix
}
