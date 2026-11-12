output "endpoint" {
  description = "Endpoint directo de la instancia principal (host:puerto). Solo para administración y rotación."
  value       = aws_db_instance.this.endpoint
}

output "proxy_endpoint" {
  description = "Endpoint del RDS Proxy de escritura (host, sin puerto). Las aplicaciones lo usan para escribir."
  value       = aws_db_proxy.this.endpoint
}

output "reader_endpoint" {
  description = "Endpoint del RDS Proxy de lectura de la primera réplica (host, sin puerto). Null si no hay réplicas."
  value       = try(aws_db_proxy.reader[0].endpoint, null)
}

output "reader_endpoints" {
  description = "Endpoints de los proxies de lectura, uno por réplica. Con más de una réplica, el cliente reparte entre ellos."
  value       = aws_db_proxy.reader[*].endpoint
}

output "replica_endpoints" {
  description = "Endpoints directos de las réplicas (host:puerto). Solo para administración: las apps usan reader_endpoint."
  value       = aws_db_instance.replica[*].endpoint
}

output "master_secret_arn" {
  description = "ARN del secreto del usuario maestro, administrado por RDS. Solo para administración: las apps no lo usan."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "service_secret_arns" {
  description = "ARN del secreto de cada usuario de servicio, por nombre."
  value       = { for name, s in aws_secretsmanager_secret.service : name => s.arn }
}

output "kms_key_arn" {
  description = "ARN de la clave KMS que cifra el almacenamiento, Performance Insights y los secretos."
  value       = aws_kms_key.this.arn
}

output "parameter_group_name" {
  description = "Nombre del grupo de parámetros de PostgreSQL."
  value       = aws_db_parameter_group.this.name
}

output "security_group_id" {
  description = "Security group de la instancia RDS."
  value       = aws_security_group.rds.id
}

output "proxy_security_group_id" {
  description = "Security group de los RDS Proxy. Los clientes salen hacia él por el puerto 5432."
  value       = aws_security_group.proxy.id
}
