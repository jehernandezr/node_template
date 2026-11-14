output "identity_arn" {
  description = "ARN de la identidad de dominio de SES."
  value       = aws_sesv2_email_identity.this.arn
}

output "configuration_set_names" {
  description = "Nombres de los configuration sets: tracked (con aperturas y clics) y security (sin seguimiento)."
  value       = { for k, c in aws_sesv2_configuration_set.this : k => c.configuration_set_name }
}

output "events_topic_arn" {
  description = "ARN del tópico SNS que recibe los eventos de SES. Suscribe aquí la cola que alimenta el seguimiento de correo."
  value       = aws_sns_topic.events.arn
}

output "events_kms_key_arn" {
  description = "ARN de la clave KMS del tópico de eventos. Quien se suscriba necesita kms:Decrypt sobre ella."
  value       = aws_kms_key.events.arn
}

output "dkim_tokens" {
  description = "Tokens DKIM de la identidad."
  value       = aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens
}

output "dns_records" {
  description = "Registros DNS que el dominio debe publicar. Si pasaste route53_zone_id ya existen."
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
  description = "Documento de política IAM para enviar correo con la identidad y los configuration sets, para el rol del servicio notifications."
  value       = data.aws_iam_policy_document.send.json
}
