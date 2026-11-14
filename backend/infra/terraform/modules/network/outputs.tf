output "vpc_id" {
  description = "ID de la VPC."
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "IDs de las subredes privadas de aplicación (2 AZ, /22). Con egress distinto de none salen por NAT."
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs de las subredes públicas (2 AZ, /22)."
  value       = aws_subnet.public[*].id
}

output "data_subnet_ids" {
  description = "IDs de las subredes de datos (2 AZ, /22). Sin ruta a Internet. Alojan RDS, RDS Proxy y Valkey."
  value       = aws_subnet.data[*].id
}

output "endpoint_security_group_id" {
  description = "Security group de los endpoints de interfaz. Permite HTTPS desde la VPC."
  value       = aws_security_group.endpoints.id
}

output "private_route_table_ids" {
  description = "IDs de las tablas de rutas de las subredes privadas (una por AZ)."
  value       = aws_route_table.private[*].id
}

output "data_route_table_id" {
  description = "ID de la tabla de rutas de las subredes de datos."
  value       = aws_route_table.data.id
}

output "nat_public_ips" {
  description = "IPs públicas de los NAT gateways, para listas de permitidos de proveedores externos. Vacío con egress none."
  value       = aws_eip.nat[*].public_ip
}

output "egress" {
  description = "Modo de salida a Internet configurado."
  value       = var.egress
}

output "flow_log_group_name" {
  description = "Nombre del grupo de CloudWatch Logs de los flow logs."
  value       = aws_cloudwatch_log_group.flow_logs.name
}

output "flow_logs_kms_key_arn" {
  description = "ARN de la clave KMS de los flow logs."
  value       = aws_kms_key.flow_logs.arn
}
