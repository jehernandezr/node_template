output "identity_arn" {
  description = "ARN of the SES domain identity."
  value       = aws_sesv2_email_identity.this.arn
}

output "configuration_set_names" {
  description = "Configuration set names: tracked (with opens and clicks) and security (no tracking)."
  value       = { for k, c in aws_sesv2_configuration_set.this : k => c.configuration_set_name }
}

output "events_topic_arn" {
  description = "ARN of the SNS topic that receives SES events. Subscribe the queue that feeds email tracking here."
  value       = aws_sns_topic.events.arn
}

output "events_kms_key_arn" {
  description = "ARN of the events topic KMS key. Subscribers need kms:Decrypt on it."
  value       = module.events_kms.arn
}

output "dkim_tokens" {
  description = "DKIM tokens of the identity."
  value       = aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens
}

output "dns_records" {
  description = "DNS records the domain must publish. They already exist if you passed route53_zone_id."
  value = concat(
    [
      for t in aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens : {
        name  = "${t}._domainkey.${var.domain}"
        type  = "CNAME"
        value = "${t}.dkim.amazonses.com"
      }
    ],
    [
      { name = local.mail_from_domain, type = "MX", value = local.mx_value },
      { name = local.mail_from_domain, type = "TXT", value = local.spf_value },
      { name = "_dmarc.${var.domain}", type = "TXT", value = local.dmarc_value },
    ]
  )
}

output "send_policy_json" {
  description = "IAM policy document to send email with the identity and the configuration sets, for the notifications service role."
  value       = data.aws_iam_policy_document.send.json
}
