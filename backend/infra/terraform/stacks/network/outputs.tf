output "vpc_id" {
  description = "ID de la VPC."
  value       = module.network.vpc_id
}

output "vpc_cidr" {
  description = "CIDR de la VPC."
  value       = var.vpc_cidr
}

output "public_subnet_ids" {
  description = "Subredes públicas (ALB público y NAT)."
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Subredes privadas de aplicación."
  value       = module.network.private_subnet_ids
}

output "data_subnet_ids" {
  description = "Subredes de datos, sin ruta a Internet."
  value       = module.network.data_subnet_ids
}

output "endpoint_security_group_id" {
  description = "Security group de los endpoints de interfaz de VPC."
  value       = module.network.endpoint_security_group_id
}

output "egress" {
  description = "Modo de salida a Internet de las subredes privadas."
  value       = module.network.egress
}

output "nat_public_ips" {
  description = "IPs públicas de salida de las apps, para listas de permitidos de proveedores externos."
  value       = module.network.nat_public_ips
}

output "flow_log_group_name" {
  description = "Grupo de CloudWatch Logs de los flow logs."
  value       = module.network.flow_log_group_name
}
