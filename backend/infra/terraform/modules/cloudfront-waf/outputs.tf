output "web_bucket_name" {
  description = "Nombre del bucket S3 donde se publica el build de Flutter web."
  value       = aws_s3_bucket.web.id
}

output "web_bucket_arn" {
  description = "ARN del bucket web."
  value       = aws_s3_bucket.web.arn
}

output "web_kms_key_arn" {
  description = "ARN de la clave KMS del bucket web. El rol de despliegue necesita kms:GenerateDataKey sobre ella."
  value       = aws_kms_key.web.arn
}

output "web_distribution_id" {
  description = "ID de la distribución de la web, para invalidaciones."
  value       = aws_cloudfront_distribution.web.id
}

output "web_distribution_arn" {
  description = "ARN de la distribución de la web."
  value       = aws_cloudfront_distribution.web.arn
}

output "web_domain_name" {
  description = "Dominio *.cloudfront.net de la web, destino de los registros alias."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "api_distribution_id" {
  description = "ID de la distribución de la API. Null si no hay origen de API."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].id : null
}

output "api_distribution_arn" {
  description = "ARN de la distribución de la API. Null si no hay origen de API."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].arn : null
}

output "api_domain_name" {
  description = "Dominio *.cloudfront.net de la API, destino de los registros alias. Null si no hay origen de API."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].domain_name : null
}

output "cloudfront_hosted_zone_id" {
  description = "ID de zona Route 53 de CloudFront, para los registros alias."
  value       = aws_cloudfront_distribution.web.hosted_zone_id
}

output "web_acl_arn" {
  description = "ARN del WAF asociado a ambas distribuciones."
  value       = aws_wafv2_web_acl.this.arn
}

output "waf_log_group_name" {
  description = "Log group de WAF en us-east-1. Null si el log está desactivado."
  value       = var.waf_logging_enabled ? aws_cloudwatch_log_group.waf[0].name : null
}
