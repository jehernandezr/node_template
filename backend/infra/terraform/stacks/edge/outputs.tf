output "web_bucket_name" {
  description = "Bucket for the Flutter web build. Null without CloudFront."
  value       = try(module.cloudfront_waf[0].web_bucket_name, null)
}

output "web_distribution_id" {
  description = "ID of the web distribution, for invalidations. Null without CloudFront."
  value       = try(module.cloudfront_waf[0].web_distribution_id, null)
}

output "web_kms_key_arn" {
  description = "KMS key of the web bucket, for the publishing pipeline."
  value       = try(module.cloudfront_waf[0].web_kms_key_arn, null)
}

output "cloudfront_web_domain_name" {
  description = "Domain of the web distribution."
  value       = try(module.cloudfront_waf[0].web_domain_name, null)
}

output "cloudfront_api_domain_name" {
  description = "Domain of the API distribution."
  value       = try(module.cloudfront_waf[0].api_domain_name, null)
}

output "web_acl_arn" {
  description = "ARN of the CloudFront WAF."
  value       = try(module.cloudfront_waf[0].web_acl_arn, null)
}
