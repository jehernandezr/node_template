output "otlp_http_endpoint" {
  description = "Endpoint OTLP HTTP base de OpenObserve (con la organización). Los exporters agregan /v1/traces, /v1/metrics y /v1/logs. Pásalo a otlp_endpoint de service-fargate."
  value       = "${local.base_url}/api/${var.organization}"
}

output "console_url" {
  description = "URL de la interfaz de OpenObserve."
  value       = local.base_url
}

output "secret_arn" {
  description = "ARN del secreto con ZO_ROOT_USER_EMAIL, ZO_ROOT_USER_PASSWORD y OTLP_AUTHORIZATION."
  value       = aws_secretsmanager_secret.root.arn
}

output "otlp_authorization_value_from" {
  description = "valueFrom del secreto con la cabecera Authorization del OTLP. Pásalo a otlp_authorization_secret de service-fargate."
  value       = "${aws_secretsmanager_secret.root.arn}:OTLP_AUTHORIZATION::"
}

output "kms_key_arn" {
  description = "ARN de la clave KMS del secreto, el bucket, EFS y los logs. Pásalo a secrets_kms_key_arns de service-fargate."
  value       = aws_kms_key.this.arn
}

output "storage_bucket_name" {
  description = "Nombre del bucket S3 donde OpenObserve guarda los datos."
  value       = aws_s3_bucket.storage.id
}

output "service_name" {
  description = "Nombre del servicio ECS de OpenObserve."
  value       = aws_ecs_service.this.name
}

output "security_group_id" {
  description = "Security group de las tareas de OpenObserve."
  value       = aws_security_group.service.id
}

output "alb_dns_name" {
  description = "Nombre DNS del ALB interno. Null si se usa un listener existente."
  value       = var.create_internal_alb ? aws_lb.internal[0].dns_name : null
}

output "alb_zone_id" {
  description = "ID de zona Route 53 del ALB interno, para registros alias. Null si se usa un listener existente."
  value       = var.create_internal_alb ? aws_lb.internal[0].zone_id : null
}

output "alb_security_group_id" {
  description = "Security group del ALB interno. Los clientes de OTLP salen hacia él. Null si se usa un listener existente."
  value       = var.create_internal_alb ? aws_security_group.alb[0].id : null
}

output "alb_port" {
  description = "Puerto del listener del ALB interno: 443 con certificado, 80 sin él."
  value       = local.tls_internal ? 443 : 80
}
