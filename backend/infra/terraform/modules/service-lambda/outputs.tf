output "function_name" {
  description = "Name of the Lambda function."
  value       = aws_lambda_function.this.function_name
}

output "invoke_arn" {
  description = "Invoke ARN, for API Gateway integrations."
  value       = aws_lambda_function.this.invoke_arn
}

output "function_arn" {
  description = "ARN of the Lambda function."
  value       = aws_lambda_function.this.arn
}

output "async_dlq_arn" {
  description = "ARN of the queue for failed asynchronous invocations."
  value       = aws_sqs_queue.dlq.arn
}

output "event_source_mapping_uuid" {
  description = "UUID of the SQS queue event source mapping. Null without a queue."
  value       = try(aws_lambda_event_source_mapping.sqs[0].uuid, null)
}
