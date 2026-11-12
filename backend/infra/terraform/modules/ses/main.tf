data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  mail_from_domain = "${var.mail_from_subdomain}.${var.domain}"
  create_dns       = var.route53_zone_id != null

  # Dos configuration sets: uno con seguimiento de aperturas y clics para correo masivo
  # y otro sin seguimiento para correo de seguridad, que solo reporta entrega y fallos.
  configuration_sets = {
    tracked = {
      name  = "${var.name_prefix}-tracked"
      types = var.tracked_event_types
    }
    security = {
      name  = "${var.name_prefix}-security"
      types = ["DELIVERY", "BOUNCE", "COMPLAINT", "REJECT"]
    }
  }

  dmarc_value = join("; ", compact([
    "v=DMARC1",
    "p=${var.dmarc_policy}",
    var.dmarc_report_email == null ? "" : "rua=mailto:${var.dmarc_report_email}",
  ]))

  spf_value = "v=spf1 include:amazonses.com ~all"
  mx_value  = "10 feedback-smtp.${data.aws_region.current.region}.amazonses.com"
}

resource "aws_kms_key" "events" {
  description             = "Cifrado del tópico de eventos de SES de ${var.name_prefix}"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableIamPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowSesUse"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = ["kms:GenerateDataKey*", "kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
      {
        Sid       = "AllowSnsUse"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = ["kms:GenerateDataKey*", "kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "events" {
  name          = "alias/${var.name_prefix}-ses-events"
  target_key_id = aws_kms_key.events.key_id
}

resource "aws_sns_topic" "events" {
  name              = "${var.name_prefix}-ses-events"
  display_name      = var.events_topic_display_name
  kms_master_key_id = aws_kms_key.events.arn

  tags = var.tags
}

resource "aws_sns_topic_policy" "events" {
  arn = aws_sns_topic.events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSesPublish"
      Effect    = "Allow"
      Principal = { Service = "ses.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.events.arn
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        ArnLike      = { "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:ses:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:configuration-set/*" }
      }
    }]
  })
}

resource "aws_sesv2_configuration_set" "this" {
  for_each = local.configuration_sets

  configuration_set_name = each.value.name

  delivery_options {
    tls_policy = "REQUIRE"
  }

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  suppression_options {
    suppressed_reasons = var.suppressed_reasons
  }

  dynamic "tracking_options" {
    for_each = each.key == "tracked" && var.tracking_redirect_domain != null ? [1] : []

    content {
      custom_redirect_domain = var.tracking_redirect_domain
    }
  }

  tags = merge(var.tags, { Name = each.value.name })
}

resource "aws_sesv2_configuration_set_event_destination" "sns" {
  for_each = local.configuration_sets

  configuration_set_name = aws_sesv2_configuration_set.this[each.key].configuration_set_name
  event_destination_name = "sns-events"

  event_destination {
    enabled              = true
    matching_event_types = each.value.types

    sns_destination {
      topic_arn = aws_sns_topic.events.arn
    }
  }

  depends_on = [aws_sns_topic_policy.events]
}

resource "aws_sesv2_email_identity" "this" {
  email_identity         = var.domain
  configuration_set_name = aws_sesv2_configuration_set.this["security"].configuration_set_name

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  tags = var.tags
}

resource "aws_sesv2_email_identity_mail_from_attributes" "this" {
  email_identity         = aws_sesv2_email_identity.this.email_identity
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "dkim" {
  count = local.create_dns ? 3 : 0

  zone_id = var.route53_zone_id
  name    = "${aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "mail_from_mx" {
  count = local.create_dns ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = [local.mx_value]
}

resource "aws_route53_record" "mail_from_spf" {
  count = local.create_dns ? 1 : 0

  zone_id = var.route53_zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = [local.spf_value]
}

resource "aws_route53_record" "dmarc" {
  count = local.create_dns ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [local.dmarc_value]
}

data "aws_iam_policy_document" "send" {
  statement {
    sid       = "SendFromDomain"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = concat([aws_sesv2_email_identity.this.arn], [for c in aws_sesv2_configuration_set.this : c.arn])
  }
}
