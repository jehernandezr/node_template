output "api_id" {
  description = "HTTP API ID. The service stacks add their routes with it."
  value       = aws_apigatewayv2_api.this.id
}

output "execution_arn" {
  description = "Execution ARN, for the Lambda invoke permissions."
  value       = aws_apigatewayv2_api.this.execution_arn
}

output "endpoint_host" {
  description = "Host of the API default endpoint, used as the CloudFront origin."
  value       = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "")
}

output "vpc_link_id" {
  description = "VPC link ID. Null without a VPC link."
  value       = try(aws_apigatewayv2_vpc_link.this[0].id, null)
}

output "vpc_link_security_group_id" {
  description = "VPC link security group. Null without a VPC link."
  value       = try(aws_security_group.vpc_link[0].id, null)
}

output "authorizer_id" {
  description = "Origin authorizer ID. Null if origin_verify_enabled is false."
  value       = try(aws_apigatewayv2_authorizer.origin_verify[0].id, null)
}

output "origin_verify_secret_arn" {
  description = "ARN of the secret holding the X-Origin-Verify value. Null if it is not required."
  value       = try(aws_secretsmanager_secret.origin_verify[0].arn, null)
}

output "kms_key_arn" {
  description = "KMS key for the logs and the origin secret."
  value       = module.kms.arn
}
