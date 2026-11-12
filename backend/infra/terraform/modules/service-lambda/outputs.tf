output "function_name" {
  description = "Nombre de la función Lambda."
  value       = aws_lambda_function.this.function_name
}

output "function_arn" {
  description = "ARN de la función Lambda."
  value       = aws_lambda_function.this.arn
}

output "role_arn" {
  description = "ARN del rol de ejecución."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "Nombre del rol de ejecución, para adjuntar políticas desde la raíz."
  value       = aws_iam_role.this.name
}

output "security_group_id" {
  description = "Security group de la función. Null si no corre en la VPC. Pásalo a allowed_security_group_ids de RDS Proxy y Valkey."
  value       = var.vpc_enabled ? aws_security_group.this[0].id : null
}

output "log_group_name" {
  description = "Nombre del log group de la función."
  value       = aws_cloudwatch_log_group.this.name
}

output "async_dlq_arn" {
  description = "ARN de la cola de invocaciones asíncronas fallidas."
  value       = aws_sqs_queue.dlq.arn
}

output "kms_key_arn" {
  description = "ARN de la clave KMS de variables de entorno, logs y DLQ."
  value       = local.kms_key_arn
}

output "event_source_mapping_uuid" {
  description = "UUID del mapeo de eventos de la cola SQS."
  value       = aws_lambda_event_source_mapping.sqs.uuid
}
