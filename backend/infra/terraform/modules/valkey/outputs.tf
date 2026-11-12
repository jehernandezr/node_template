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
