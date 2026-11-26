# Resources unique to the account (ADR 0042): applied once per account, before any regional stack.

data "aws_partition" "current" {}

locals {
  partition = data.aws_partition.current.partition

  apex_zone = var.environment == "prod"
  zone_name = local.apex_zone ? var.domain : "${var.environment}.${var.domain}"
  zone_id   = local.apex_zone ? data.aws_route53_zone.apex[0].zone_id : aws_route53_zone.environment[0].zone_id

  project_prefix = trimsuffix(var.name_prefix, "-${var.environment}")
  promotion_role_arns = [
    for env in sort(keys(var.promotion_account_ids)) :
    "arn:${local.partition}:iam::${var.promotion_account_ids[env]}:role/${local.project_prefix}-${env}-github-deploy"
  ]
  promotes = length(local.promotion_role_arns) > 0
}
