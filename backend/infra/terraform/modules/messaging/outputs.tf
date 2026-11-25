output "topic_arns" {
  description = "ARN of each SNS topic, keyed by the name declared in the topology."
  value       = { for name, t in aws_sns_topic.this : name => t.arn }
}

output "queue_urls" {
  description = "URL of each SQS queue, keyed by the name declared in the topology."
  value       = { for name, q in aws_sqs_queue.this : name => q.url }
}

output "queue_arns" {
  description = "ARN of each SQS queue, keyed by the name declared in the topology."
  value       = { for name, q in aws_sqs_queue.this : name => q.arn }
}

output "dlq_arns" {
  description = "ARN of each queue's DLQ."
  value       = { for name, q in aws_sqs_queue.dlq : name => q.arn }
}

output "service_access" {
  description = "Per service, based on the topology producers and consumer: publish_topics, send_queues and consume_queues."
  value       = local.service_access
}

output "queue_names" {
  description = "Final name (with prefix and .fifo) of each queue, keyed by declared name."
  value       = { for name, q in aws_sqs_queue.this : name => q.name }
}

output "kms_key_arn" {
  description = "ARN of the KMS key that encrypts topics, queues and DLQs."
  value       = module.kms.arn
}
