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
  description = "ARN of the secret of each password user, by name. Read only by RDS Proxy, the rotation and the bootstrap."
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

output "proxy_resource_id" {
  description = "Resource id of the RDS Proxy (prx-...), the one rds-db:connect ARNs name for the proxy."
  value       = element(split(":", aws_db_proxy.this.arn), 6)
}

output "replica_resource_ids" {
  description = "Resource id (db-...) of each read replica, the one rds-db:connect ARNs name for it."
  value       = aws_db_instance.replica[*].resource_id
}

output "proxy_name" {
  description = "Name of the RDS Proxy."
  value       = aws_db_proxy.this.name
}

output "proxy_auth" {
  description = "Auth entries of RDS Proxy: one per password user, with the IAM requirement on clients."
  value       = [for auth in aws_db_proxy.this.auth : { auth_scheme = auth.auth_scheme, iam_auth = auth.iam_auth, secret_arn = auth.secret_arn }]
}

output "iam_database_authentication_enabled" {
  description = "Whether the instance and every replica accept IAM database authentication."
  value       = aws_db_instance.this.iam_database_authentication_enabled && alltrue(aws_db_instance.replica[*].iam_database_authentication_enabled)
}

output "pinned_connections_alarm" {
  description = "Alarm on proxy connections pinned to a session: metric_name, threshold and dimensions."
  value = {
    metric_name = aws_cloudwatch_metric_alarm.proxy_pinned_connections.metric_name
    threshold   = aws_cloudwatch_metric_alarm.proxy_pinned_connections.threshold
    dimensions  = aws_cloudwatch_metric_alarm.proxy_pinned_connections.dimensions
  }
}
