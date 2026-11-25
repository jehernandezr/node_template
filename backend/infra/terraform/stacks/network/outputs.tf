output "vpc_id" {
  description = "ID of the VPC."
  value       = module.network.vpc_id
}

output "vpc_cidr" {
  description = "CIDR of the VPC."
  value       = var.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnets (public ALB and NAT)."
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private application subnets."
  value       = module.network.private_subnet_ids
}

output "data_subnet_ids" {
  description = "Data subnets, with no route to the Internet."
  value       = module.network.data_subnet_ids
}

output "endpoint_security_group_id" {
  description = "Security group of the VPC interface endpoints."
  value       = module.network.endpoint_security_group_id
}

output "egress" {
  description = "Internet egress mode of the private subnets."
  value       = module.network.egress
}

output "nat_public_ips" {
  description = "Public egress IPs of the apps, for allowlists of external providers."
  value       = module.network.nat_public_ips
}

output "flow_log_group_name" {
  description = "CloudWatch Logs group of the flow logs."
  value       = module.network.flow_log_group_name
}
