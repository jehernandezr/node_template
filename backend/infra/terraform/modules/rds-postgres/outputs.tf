output "endpoint" {
  description = "Direct endpoint of the primary instance (host:port). Only for administration and rotation."
  value       = aws_db_instance.this.endpoint
}

output "proxy_endpoint" {
  description = "Endpoint of the write RDS Proxy (host, no port). Applications use it to write."
  value       = aws_db_proxy.this.endpoint
}

output "reader_endpoint" {
  description = "Host of the first read replica. Null if there are no replicas. Outside Aurora, RDS Proxy only supports the writer, so reads go straight to the replica."
  value       = try(aws_db_instance.replica[0].address, null)
}

output "reader_endpoints" {
  description = "Host of each read replica. With more than one, the client spreads load across them."
  value       = aws_db_instance.replica[*].address
}

output "replica_security_group_id" {
  description = "Security group of the replicas. Null without replicas."
  value       = try(aws_security_group.replica[0].id, null)
}

output "master_secret_arn" {
  description = "ARN of the master user secret, managed by RDS. Only for administration: apps do not use it."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "service_secret_arns" {
  description = "ARN of each service user's secret, by name."
  value       = { for name, s in aws_secretsmanager_secret.service : name => s.arn }
}

output "kms_key_arn" {
  description = "ARN of the KMS key that encrypts the storage, Performance Insights and the secrets."
  value       = module.kms.arn
}

output "parameter_group_name" {
  description = "Name of the PostgreSQL parameter group."
  value       = aws_db_parameter_group.this.name
}

output "security_group_id" {
  description = "Security group of the RDS instance."
  value       = aws_security_group.rds.id
}

output "proxy_security_group_id" {
  description = "Security group of the RDS Proxy. Clients connect out to it on port 5432."
  value       = aws_security_group.proxy.id
}
