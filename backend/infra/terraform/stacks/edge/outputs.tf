output "web_bucket_name" {
  description = "Bucket del build de Flutter web. Null sin CloudFront."
  value       = try(module.cloudfront_waf[0].web_bucket_name, null)
}

output "web_distribution_id" {
  description = "ID de la distribución de la web, para invalidaciones. Null sin CloudFront."
  value       = try(module.cloudfront_waf[0].web_distribution_id, null)
}

output "web_kms_key_arn" {
  description = "Clave KMS del bucket web, para el pipeline de publicación."
  value       = try(module.cloudfront_waf[0].web_kms_key_arn, null)
}

output "cloudfront_web_domain_name" {
  description = "Dominio de la distribución de la web."
  value       = try(module.cloudfront_waf[0].web_domain_name, null)
}

output "cloudfront_api_domain_name" {
  description = "Dominio de la distribución de la API."
  value       = try(module.cloudfront_waf[0].api_domain_name, null)
}

output "web_acl_arn" {
  description = "ARN del WAF de CloudFront."
  value       = try(module.cloudfront_waf[0].web_acl_arn, null)
}
