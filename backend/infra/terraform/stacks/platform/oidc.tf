# Acceso de GitHub Actions a la cuenta por OIDC, sin claves de larga vida. Sin github_repository no
# se crea nada: el pipeline queda apagado hasta que el ambiente lo pida.
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
