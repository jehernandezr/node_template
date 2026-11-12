output "endpoint" {
  description = "Endpoint directo de la instancia principal (host:puerto)."
  value       = aws_db_instance.this.endpoint
}

output "proxy_endpoint" {
  description = "Endpoint del RDS Proxy (host:puerto). Las aplicaciones lo usan para escribir."
  value       = aws_db_proxy.this.endpoint
}

output "replica_endpoints" {
  description = "Endpoints de las réplicas de lectura (host:puerto)."
  value       = aws_db_instance.replica[*].endpoint
}

output "secret_arn" {
  description = "ARN del secreto con las credenciales maestras, administrado por RDS."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  description = "Security group de la instancia RDS."
  value       = aws_security_group.rds.id
}

output "proxy_security_group_id" {
  description = "Security group del RDS Proxy. Los clientes salen hacia él por el puerto 5432."
  value       = aws_security_group.proxy.id
}
