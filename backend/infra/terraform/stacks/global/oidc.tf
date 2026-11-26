# GitHub Actions access to the account through OIDC, without long-lived keys.

module "oidc_github" {
  source = "../../modules/oidc-github"

  name_prefix           = var.name_prefix
  github_repository     = var.github_repository
  github_environment    = var.environment
  create_provider       = var.oidc_existing_provider_arn == null
  existing_provider_arn = var.oidc_existing_provider_arn
  state_bucket          = var.state_bucket
  deploy_policy_arns    = var.deploy_policy_arns
  artifacts_bucket_arn  = local.artifacts_bucket_arn
  artifacts_kms_key_arn = module.artifacts_kms.arn
  ecr_repository_arns   = [for repository in aws_ecr_repository.service : repository.arn]
  tags                  = local.common_tags
}
