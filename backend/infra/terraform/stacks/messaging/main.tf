# Tópicos, colas y DLQ leídos de la topología que exporta backend/tools/contracts-export
# (backend/infra/terraform/topology.json, confirmado en git y verificado en CI), más la cola
# de eventos de SES cuando el stack platform tiene SES.

locals {
  topology_file = startswith(var.topology_file, "/") ? var.topology_file : abspath("${path.root}/${var.topology_file}")

  ses = local.platform.ses
}

module "messaging" {
  source = "../../modules/messaging"

  name_prefix       = var.name_prefix
  topology_file     = local.topology_file
  alarm_topic_arn   = local.platform.alarm_topic_arn
  max_receive_count = var.max_receive_count

  # LocalStack no emula bien las alarmas ni el borrado de redrive_allow_policy.
  alarms_enabled               = !local.localstack
  redrive_allow_policy_enabled = !local.localstack
}

# Cola de eventos de SES para el seguimiento de correo. La política de las colas de la
# topología solo autoriza a sus propios tópicos, así que esta cola se declara aparte.
resource "aws_sqs_queue" "ses_events_dlq" {
  count = local.ses == null ? 0 : 1

  name                              = "${var.name_prefix}-ses-events-dlq"
  message_retention_seconds         = 1209600
  kms_master_key_id                 = module.messaging.kms_key_arn
  kms_data_key_reuse_period_seconds = 300
}

resource "aws_sqs_queue" "ses_events" {
  count = local.ses == null ? 0 : 1

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
  count = local.ses == null ? 0 : 1

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
        Condition = { ArnEquals = { "aws:SourceArn" = local.ses.events_topic_arn } }
      },
    ]
  })
}

resource "aws_sns_topic_subscription" "ses_events" {
  count = local.ses == null ? 0 : 1

  topic_arn            = local.ses.events_topic_arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.ses_events[0].arn
  raw_message_delivery = true

  depends_on = [aws_sqs_queue_policy.ses_events]
}
