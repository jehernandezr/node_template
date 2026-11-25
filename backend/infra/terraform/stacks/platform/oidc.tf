# GitHub Actions access to the account through OIDC, with no long-lived keys. Without github_repository
# nothing is created: the pipeline stays off until the environment asks for it.
module "oidc_github" {
  count  = var.github_repository == null ? 0 : 1
  source = "../../modules/oidc-github"

  name_prefix             = var.name_prefix
  github_repository       = var.github_repository
  github_environment      = coalesce(var.github_environment, var.environment)
  create_provider         = var.oidc_create_provider
  existing_provider_arn   = var.oidc_existing_provider_arn
  state_bucket            = var.state_bucket
  deploy_policy_arns      = var.deploy_policy_arns
  artifacts_force_destroy = var.force_destroy_buckets
  tags                    = local.common_tags
}
