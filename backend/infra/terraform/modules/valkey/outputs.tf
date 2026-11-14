output "endpoint" {
  description = "Host de la caché Valkey serverless."
  value       = aws_elasticache_serverless_cache.this.endpoint[0].address
}

output "port" {
  description = "Puerto de la caché Valkey serverless."
  value       = aws_elasticache_serverless_cache.this.endpoint[0].port
}

output "security_group_id" {
  description = "Security group de la caché."
  value       = aws_security_group.this.id
}

output "tls" {
  description = "La caché serverless exige TLS en todas las conexiones. Los clientes usan rediss://."
  value       = true
}

output "kms_key_arn" {
  description = "ARN de la clave KMS que cifra la caché en reposo."
  value       = aws_kms_key.this.arn
}

output "cache_arn" {
  description = "ARN de la caché serverless."
  value       = aws_elasticache_serverless_cache.this.arn
}

output "iam_user_names" {
  description = "Nombre de usuario Valkey de cada servicio, por clave de var.users. Es el usuario con el que el cliente firma el token IAM."
  value       = { for name, u in aws_elasticache_user.app : name => u.user_name }
}

output "connect_resource_arns" {
  description = "Por servicio, los ARN que su rol IAM necesita en elasticache:Connect: la caché y su usuario."
  value       = { for name, arn in local.user_arns : name => [local.cache_arn, arn] }
}
