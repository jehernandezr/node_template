output "topic_arns" {
  description = "ARN de cada tópico SNS, por nombre declarado en la topología."
  value       = { for name, t in aws_sns_topic.this : name => t.arn }
}

output "queue_urls" {
  description = "URL de cada cola SQS, por nombre declarado en la topología."
  value       = { for name, q in aws_sqs_queue.this : name => q.url }
}

output "queue_arns" {
  description = "ARN de cada cola SQS, por nombre declarado en la topología."
  value       = { for name, q in aws_sqs_queue.this : name => q.arn }
}

output "dlq_arns" {
  description = "ARN de la DLQ de cada cola."
  value       = { for name, q in aws_sqs_queue.dlq : name => q.arn }
}

output "kms_key_arn" {
  description = "ARN de la clave KMS que cifra tópicos, colas y DLQ."
  value       = aws_kms_key.messaging.arn
}
