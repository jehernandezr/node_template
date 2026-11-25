output "otlp_http_endpoint" {
  description = "Base OTLP HTTP endpoint of OpenObserve (including the organization). Exporters append /v1/traces, /v1/metrics and /v1/logs. Pass it to otlp_endpoint of service-fargate."
  value       = "${local.base_url}/api/${var.organization}"
}

output "console_url" {
  description = "OpenObserve UI URL."
  value       = local.base_url
}

output "secret_arn" {
  description = "ARN of the secret with ZO_ROOT_USER_EMAIL, ZO_ROOT_USER_PASSWORD and OTLP_AUTHORIZATION."
  value       = aws_secretsmanager_secret.root.arn
}

output "otlp_authorization_value_from" {
  description = "valueFrom of the secret with the OTLP Authorization header. Pass it to otlp_authorization_secret of service-fargate."
  value       = "${aws_secretsmanager_secret.root.arn}:OTLP_AUTHORIZATION::"
}

output "kms_key_arn" {
  description = "ARN of the KMS key for the secret, the bucket, EFS and the logs. Pass it to secrets_kms_key_arns of service-fargate."
  value       = module.kms.arn
}

output "storage_bucket_name" {
  description = "Name of the S3 bucket where OpenObserve stores data."
  value       = aws_s3_bucket.storage.id
}

output "service_name" {
  description = "OpenObserve ECS service name."
  value       = aws_ecs_service.this.name
}

output "security_group_id" {
  description = "Security group of the OpenObserve tasks."
  value       = aws_security_group.service.id
}

output "alb_dns_name" {
  description = "DNS name of the internal ALB. Null when an existing listener is used."
  value       = var.create_internal_alb ? aws_lb.internal[0].dns_name : null
}

output "alb_zone_id" {
  description = "Route 53 zone ID of the internal ALB, for alias records. Null when an existing listener is used."
  value       = var.create_internal_alb ? aws_lb.internal[0].zone_id : null
}

output "alb_security_group_id" {
  description = "Security group of the internal ALB. OTLP clients send egress to it. Null when an existing listener is used."
  value       = var.create_internal_alb ? aws_security_group.alb[0].id : null
}

output "alb_port" {
  description = "Internal ALB listener port: 443 with a certificate, 80 without one."
  value       = local.tls_internal ? 443 : 80
}
