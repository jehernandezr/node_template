# Topics, queues and DLQs read from the topology exported by backend/tools/contracts-export
# (backend/infra/terraform/topology.json, committed to git and verified in CI), plus the SES
# events queue when the platform stack has SES.

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

  # LocalStack does not emulate alarms or the removal of redrive_allow_policy well.
  alarms_enabled               = !local.localstack
  redrive_allow_policy_enabled = !local.localstack
}

# SES events queue for email tracking. The policy of the topology queues only authorizes
# their own topics, so this queue is declared separately.
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
