# CloudFront + WAF, archivos, SES y DNS.

locals {
  alb_enabled        = var.alb_certificate_arn != null
  cloudfront_enabled = var.cloudfront_certificate_arn != null
  # CloudFront llega a la API por el ALB con alb_hostname como origen.
  cloudfront_api_enabled = local.cloudfront_enabled && local.alb_enabled && var.alb_hostname != null
  # Con CloudFront delante de la API, el ALB exige X-Origin-Verify.
  origin_verify_value = local.cloudfront_api_enabled ? coalesce(var.origin_verify_header_value, try(random_password.origin_verify[0].result, null)) : null

  files_cors_origins = var.files_cors_allowed_origins != null ? var.files_cors_allowed_origins : [for d in var.web_aliases : "https://${d}"]
}

resource "random_password" "origin_verify" {
  count = local.cloudfront_api_enabled && var.origin_verify_header_value == null ? 1 : 0

  length  = 48
  special = false
}

module "cloudfront_waf" {
  count  = local.cloudfront_enabled ? 1 : 0
  source = "../modules/cloudfront-waf"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix                    = var.name_prefix
  acm_certificate_arn            = var.cloudfront_certificate_arn
  web_aliases                    = var.web_aliases
  web_force_destroy              = var.force_destroy_buckets
  api_origin_domain_name         = local.cloudfront_api_enabled ? var.alb_hostname : null
  api_aliases                    = var.api_aliases
  api_origin_verify_header_value = local.origin_verify_value
  waf_block_mode                 = var.waf_block_mode
  content_security_policy        = var.content_security_policy
}

module "files_bucket" {
  count  = length(local.files_cors_origins) > 0 ? 1 : 0
  source = "../modules/files-bucket"

  name_prefix          = var.name_prefix
  cors_allowed_origins = local.files_cors_origins
  force_destroy        = var.force_destroy_buckets
}

module "ses" {
  count  = var.ses_domain == null ? 0 : 1
  source = "../modules/ses"

  name_prefix        = var.name_prefix
  domain             = var.ses_domain
  route53_zone_id    = var.route53_zone_id
  dmarc_policy       = var.ses_dmarc_policy
  dmarc_report_email = var.ses_dmarc_report_email
}

# Cola de eventos de SES para el seguimiento de correo. La política de las colas de
# la topología solo autoriza a sus propios tópicos, así que esta cola es de la raíz.
# Usa la clave KMS de messaging, que ya permite a SNS y SQS.
resource "aws_sqs_queue" "ses_events_dlq" {
  count = var.ses_domain == null ? 0 : 1

  name                              = "${var.name_prefix}-ses-events-dlq"
  message_retention_seconds         = 1209600
  kms_master_key_id                 = module.messaging.kms_key_arn
  kms_data_key_reuse_period_seconds = 300
}

resource "aws_sqs_queue" "ses_events" {
  count = var.ses_domain == null ? 0 : 1

  name                              = "${var.name_prefix}-ses-events"
  visibility_timeout_seconds        = 60
  kms_master_key_id                 = module.messaging.kms_key_arn
  kms_data_key_reuse_period_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ses_events_dlq[0].arn
    maxReceiveCount     = 5
  })
}

resource "aws_sqs_queue_policy" "ses_events" {
  count = var.ses_domain == null ? 0 : 1

  queue_url = aws_sqs_queue.ses_events[0].url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "sqs:*"
        Resource  = aws_sqs_queue.ses_events[0].arn
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AllowSesEventsTopic"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.ses_events[0].arn
        Condition = { ArnEquals = { "aws:SourceArn" = module.ses[0].events_topic_arn } }
      },
    ]
  })
}

resource "aws_sns_topic_subscription" "ses_events" {
  count = var.ses_domain == null ? 0 : 1

  topic_arn            = module.ses[0].events_topic_arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.ses_events[0].arn
  raw_message_delivery = true

  depends_on = [aws_sqs_queue_policy.ses_events]
}

# --- Route 53 ----------------------------------------------------------------

resource "aws_route53_record" "web" {
  for_each = var.route53_zone_id != null && local.cloudfront_enabled ? toset(var.web_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = module.cloudfront_waf[0].web_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "web_ipv6" {
  for_each = var.route53_zone_id != null && local.cloudfront_enabled ? toset(var.web_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = module.cloudfront_waf[0].web_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  for_each = var.route53_zone_id != null && local.cloudfront_api_enabled ? toset(var.api_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = module.cloudfront_waf[0].api_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_ipv6" {
  for_each = var.route53_zone_id != null && local.cloudfront_api_enabled ? toset(var.api_aliases) : toset([])

  zone_id = var.route53_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = module.cloudfront_waf[0].api_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "alb" {
  count = var.route53_zone_id != null && local.alb_enabled && var.alb_hostname != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.alb_hostname
  type    = "A"

  alias {
    name                   = module.alb[0].dns_name
    zone_id                = module.alb[0].zone_id
    evaluate_target_health = true
  }
}
