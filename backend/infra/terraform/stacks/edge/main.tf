# Entrada pública: CloudFront con WAF para la web Flutter y la API HTTP (stack platform), y
# los registros DNS. El tiempo real entra directo por su ALB público.

locals {
  http_api     = local.platform.http_api
  realtime_alb = local.platform.realtime_alb

  cloudfront_enabled = var.cloudfront_certificate_arn != null
  api_enabled        = local.cloudfront_enabled && local.http_api != null
  origin_verify      = local.api_enabled && try(local.http_api.origin_verify_secret_arn, null) != null
}

# El valor de X-Origin-Verify lo genera platform sin guardarlo en su estado. CloudFront lo
# necesita como encabezado de origen, así que queda en el estado de este stack.
data "aws_secretsmanager_secret_version" "origin_verify" {
  count = local.origin_verify ? 1 : 0

  secret_id = local.http_api.origin_verify_secret_arn
}

module "cloudfront_waf" {
  count  = local.cloudfront_enabled ? 1 : 0
  source = "../../modules/cloudfront-waf"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix                    = var.name_prefix
  acm_certificate_arn            = var.cloudfront_certificate_arn
  web_aliases                    = var.web_aliases
  web_force_destroy              = var.force_destroy_buckets
  api_origin_domain_name         = local.api_enabled ? local.http_api.endpoint_host : null
  api_aliases                    = var.api_aliases
  api_origin_verify_header_value = local.origin_verify ? data.aws_secretsmanager_secret_version.origin_verify[0].secret_string : null
  api_origin_read_timeout        = 30
  waf_block_mode                 = var.waf_block_mode
  content_security_policy        = var.content_security_policy
}

# --- Route 53 ----------------------------------------------------------------

locals {
  dns_enabled = var.route53_zone_id != null && local.cloudfront_enabled

  # Un registro A y uno AAAA por alias.
  web_records = local.dns_enabled ? { for pair in setproduct(var.web_aliases, ["A", "AAAA"]) : "${pair[0]}-${pair[1]}" => { name = pair[0], type = pair[1] } } : {}
  api_records = local.dns_enabled && local.api_enabled ? { for pair in setproduct(var.api_aliases, ["A", "AAAA"]) : "${pair[0]}-${pair[1]}" => { name = pair[0], type = pair[1] } } : {}
}

resource "aws_route53_record" "web" {
  for_each = local.web_records

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = module.cloudfront_waf[0].web_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  for_each = local.api_records

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = module.cloudfront_waf[0].api_domain_name
    zone_id                = module.cloudfront_waf[0].cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "realtime" {
  count = var.route53_zone_id != null && var.realtime_hostname != null && local.realtime_alb != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.realtime_hostname
  type    = "A"

  alias {
    name                   = local.realtime_alb.dns_name
    zone_id                = local.realtime_alb.zone_id
    evaluate_target_health = true
  }
}
