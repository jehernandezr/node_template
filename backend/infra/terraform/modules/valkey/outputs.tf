output "endpoint" {
  description = "Host of the serverless Valkey cache."
  value       = aws_elasticache_serverless_cache.this.endpoint[0].address
}

output "cache_name" {
  description = "Name of the serverless cache. It is the host that the clients sign the IAM token for."
  value       = aws_elasticache_serverless_cache.this.name
}

output "port" {
  description = "Port of the serverless Valkey cache."
  value       = aws_elasticache_serverless_cache.this.endpoint[0].port
}

output "security_group_id" {
  description = "Security group of the cache."
  value       = aws_security_group.this.id
}

output "tls" {
  description = "The serverless cache requires TLS on all connections. Clients use rediss://."
  value       = true
}

output "kms_key_arn" {
  description = "ARN of the KMS key that encrypts the cache at rest."
  value       = module.kms.arn
}

output "cache_arn" {
  description = "ARN of the serverless cache."
  value       = aws_elasticache_serverless_cache.this.arn
}

output "iam_user_names" {
  description = "Valkey user name of each service, by var.users key. It is the user the client signs the IAM token with."
  value       = { for name, u in aws_elasticache_user.app : name => u.user_name }
}

output "connect_resource_arns" {
  description = "Per service, the ARNs its IAM role needs in elasticache:Connect: the cache and its user."
  value       = { for name, arn in local.user_arns : name => [local.cache_arn, arn] }
}
