output "github_oidc" {
  description = "GitHub Actions access through OIDC: provider_arn, deploy_role_arn, publish_role_arn and web_role_arn."
  value = {
    provider_arn     = module.oidc_github.provider_arn
    deploy_role_arn  = module.oidc_github.deploy_role_arn
    publish_role_arn = module.oidc_github.publish_role_arn
    web_role_arn     = module.oidc_github.web_role_arn
  }
}

output "artifacts_bucket" {
  description = "Bucket for the Lambda packages (lambda/<service>/<commit>.zip) and the mobile builds."
  value       = aws_s3_bucket.artifacts.bucket
}

output "ecr_repository_prefix" {
  description = "Prefix of the services' ECR repositories: <prefix>/<service>."
  value       = var.name_prefix
}

output "ecr_repository_urls" {
  description = "URL of each service's ECR repository."
  value       = { for service, repository in aws_ecr_repository.service : service => repository.repository_url }
}

output "hosted_zone" {
  description = "The environment's public hosted zone: id, name and name_servers. In dev and staging, add name_servers as an NS record for the name in the apex zone."
  value = {
    id           = local.zone_id
    name         = local.zone_name
    name_servers = local.apex_zone ? data.aws_route53_zone.apex[0].name_servers : aws_route53_zone.environment[0].name_servers
  }
}

output "cloudfront_certificate_arn" {
  description = "Validated certificate in us-east-1 for api.<zone> and app.<zone>, for the CloudFront distributions."
  value       = aws_acm_certificate_validation.cloudfront.certificate_arn
}
