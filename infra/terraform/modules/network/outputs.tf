output "vpc_id" {
  description = "ID de la VPC."
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "IDs de las subredes privadas (2 AZ, /22)."
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs de las subredes públicas (2 AZ, /22)."
  value       = aws_subnet.public[*].id
}

output "endpoint_security_group_id" {
  description = "Security group de los endpoints de interfaz. Permite HTTPS desde la VPC."
  value       = aws_security_group.endpoints.id
}
