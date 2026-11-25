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

output "role_arn" {
  description = "ARN of the execution role."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "Name of the execution role, to attach policies from the root module."
  value       = aws_iam_role.this.name
}

output "security_group_id" {
  description = "Security group of the function. Null if it does not run in the VPC. Data access comes through additional_security_group_ids."
  value       = var.vpc_enabled ? aws_security_group.this[0].id : null
}

output "log_group_name" {
  description = "Name of the function log group."
  value       = aws_cloudwatch_log_group.this.name
}

output "async_dlq_arn" {
  description = "ARN of the queue for failed asynchronous invocations."
  value       = aws_sqs_queue.dlq.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for environment variables, logs and the DLQ."
  value       = local.kms_key_arn
}

output "event_source_mapping_uuid" {
  description = "UUID of the SQS queue event source mapping. Null without a queue."
  value       = try(aws_lambda_event_source_mapping.sqs[0].uuid, null)
}
