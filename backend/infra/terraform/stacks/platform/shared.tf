# Archivos de usuarios y correo. Existen también en el ambiente local (LocalStack).

module "files_bucket" {
  count  = length(var.files_cors_allowed_origins) > 0 ? 1 : 0
  source = "../../modules/files-bucket"

  name_prefix          = var.name_prefix
  cors_allowed_origins = var.files_cors_allowed_origins
  force_destroy        = var.force_destroy_buckets
}

module "ses" {
  count  = var.ses_domain == null ? 0 : 1
  source = "../../modules/ses"

  name_prefix        = var.name_prefix
  domain             = var.ses_domain
  route53_zone_id    = var.route53_zone_id
  dmarc_policy       = var.ses_dmarc_policy
  dmarc_report_email = var.ses_dmarc_report_email
}
