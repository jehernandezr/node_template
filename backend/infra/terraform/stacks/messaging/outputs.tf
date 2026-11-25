locals {
  ses_queue = local.ses == null ? {} : { "ses-events" = aws_sqs_queue.ses_events[0] }
}

output "topic_arns" {
  description = "ARN of each SNS topic, by the name declared in the topology."
  value       = module.messaging.topic_arns
}

output "queue_arns" {
  description = "ARN of each SQS queue, by declared name. Includes ses-events when SES is enabled."
  value       = merge(module.messaging.queue_arns, { for k, q in local.ses_queue : k => q.arn })
}

output "queue_urls" {
  description = "URL of each SQS queue, by declared name. Includes ses-events when SES is enabled."
  value       = merge(module.messaging.queue_urls, { for k, q in local.ses_queue : k => q.url })
}

output "queue_names" {
  description = "Final name of each SQS queue, for metrics and scaling. Includes ses-events when SES is enabled."
  value       = merge(module.messaging.queue_names, { for k, q in local.ses_queue : k => q.name })
}

output "dlq_arns" {
  description = "ARN of the DLQ of each queue."
  value       = module.messaging.dlq_arns
}

output "service_access" {
  description = "Per service, the topics it publishes to and the queues it sends to or consumes from, according to the topology."
  value       = module.messaging.service_access
}

output "kms_key_arn" {
  description = "ARN of the KMS key for topics and queues."
  value       = module.messaging.kms_key_arn
}

output "name_prefix" {
  description = "Name prefix of topics and queues, for the messaging adapters."
  value       = var.name_prefix
}
