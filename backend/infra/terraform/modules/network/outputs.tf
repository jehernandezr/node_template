output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "IDs of the private application subnets (2 AZs, /22). With egress other than none they go out through NAT."
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (2 AZs, /22)."
  value       = aws_subnet.public[*].id
}

output "data_subnet_ids" {
  description = "IDs of the data subnets (2 AZs, /22). No route to the Internet. They host RDS, RDS Proxy and Valkey."
  value       = aws_subnet.data[*].id
}

output "endpoint_security_group_id" {
  description = "Security group of the interface endpoints. Allows HTTPS from the VPC."
  value       = aws_security_group.endpoints.id
}

output "private_route_table_ids" {
  description = "IDs of the private subnet route tables (one per AZ)."
  value       = aws_route_table.private[*].id
}

output "data_route_table_id" {
  description = "ID of the data subnet route table."
  value       = aws_route_table.data.id
}

output "nat_public_ips" {
  description = "Public IPs of the NAT gateways, for external provider allowlists. Empty with egress none."
  value       = aws_eip.nat[*].public_ip
}

output "egress" {
  description = "Configured Internet egress mode."
  value       = var.egress
}

output "flow_log_group_name" {
  description = "Name of the CloudWatch Logs group for the flow logs."
  value       = aws_cloudwatch_log_group.flow_logs.name
}

output "flow_logs_kms_key_arn" {
  description = "ARN of the flow logs KMS key."
  value       = module.flow_logs_kms.arn
}
