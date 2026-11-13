output "api_id" {
  description = "ID de la API HTTP. Los stacks de servicio agregan sus rutas con él."
  value       = aws_apigatewayv2_api.this.id
}

output "execution_arn" {
  description = "ARN de ejecución, para los permisos de invocación de las Lambdas."
  value       = aws_apigatewayv2_api.this.execution_arn
}

output "endpoint_host" {
  description = "Host del endpoint por defecto de la API, origen de CloudFront."
  value       = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "")
}

output "vpc_link_id" {
  description = "ID del VPC link. Null sin VPC link."
  value       = try(aws_apigatewayv2_vpc_link.this[0].id, null)
}

output "vpc_link_security_group_id" {
  description = "Security group del VPC link. Null sin VPC link."
  value       = try(aws_security_group.vpc_link[0].id, null)
}

output "authorizer_id" {
  description = "ID del autorizador de origen. Null si origin_verify_enabled es false."
  value       = try(aws_apigatewayv2_authorizer.origin_verify[0].id, null)
}

output "origin_verify_secret_arn" {
  description = "ARN del secreto con el valor de X-Origin-Verify. Null si no se exige."
  value       = try(aws_secretsmanager_secret.origin_verify[0].arn, null)
}

output "kms_key_arn" {
  description = "Clave KMS de los logs y del secreto de origen."
  value       = aws_kms_key.this.arn
}
