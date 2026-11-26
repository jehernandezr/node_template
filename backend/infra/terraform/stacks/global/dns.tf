# The environment's public hosted zone and the CloudFront certificate (ADR 0042, ADR 0045). dev and
# staging create <environment>.<domain>; the user delegates it from the apex zone with the name_servers
# output. prod reads the apex zone, which the user creates in the prod account.

resource "aws_route53_zone" "environment" {
  count = local.apex_zone ? 0 : 1

  name    = local.zone_name
  comment = "Public zone of ${var.environment}, delegated from ${var.domain}"
}

data "aws_route53_zone" "apex" {
  count = local.apex_zone ? 1 : 0

  name         = var.domain
  private_zone = false
}

locals {
  certificate_names = ["api.${local.zone_name}", "app.${local.zone_name}"]
  certificate_validation = {
    for option in aws_acm_certificate.cloudfront.domain_validation_options : option.domain_name => option
  }
}

resource "aws_acm_certificate" "cloudfront" {
  region = "us-east-1"

  domain_name               = local.certificate_names[0]
  subject_alternative_names = slice(local.certificate_names, 1, length(local.certificate_names))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = toset(local.certificate_names)

  zone_id         = local.zone_id
  name            = local.certificate_validation[each.key].resource_record_name
  type            = local.certificate_validation[each.key].resource_record_type
  records         = [local.certificate_validation[each.key].resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cloudfront" {
  region = "us-east-1"

  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}
