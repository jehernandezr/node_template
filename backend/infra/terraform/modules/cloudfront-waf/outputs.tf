output "web_bucket_name" {
  description = "Name of the S3 bucket where the Flutter web build is published."
  value       = aws_s3_bucket.web.id
}

output "web_bucket_arn" {
  description = "ARN of the web bucket."
  value       = aws_s3_bucket.web.arn
}

output "web_kms_key_arn" {
  description = "ARN of the web bucket KMS key. The deploy role needs kms:GenerateDataKey on it."
  value       = module.web_kms.arn
}

output "web_distribution_id" {
  description = "ID of the web distribution, for invalidations."
  value       = aws_cloudfront_distribution.web.id
}

output "web_distribution_arn" {
  description = "ARN of the web distribution."
  value       = aws_cloudfront_distribution.web.arn
}

output "web_domain_name" {
  description = "*.cloudfront.net domain of the web app, target of the alias records."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "api_distribution_id" {
  description = "ID of the API distribution. Null if there is no API origin."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].id : null
}

output "api_distribution_arn" {
  description = "ARN of the API distribution. Null if there is no API origin."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].arn : null
}

output "api_domain_name" {
  description = "*.cloudfront.net domain of the API, target of the alias records. Null if there is no API origin."
  value       = local.create_api ? aws_cloudfront_distribution.api[0].domain_name : null
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront Route 53 zone ID, for the alias records."
  value       = aws_cloudfront_distribution.web.hosted_zone_id
}

output "web_acl_arn" {
  description = "ARN of the WAF attached to both distributions."
  value       = aws_wafv2_web_acl.this.arn
}

output "waf_log_group_name" {
  description = "WAF log group in us-east-1. Null if logging is disabled."
  value       = var.waf_logging_enabled ? aws_cloudwatch_log_group.waf[0].name : null
}
