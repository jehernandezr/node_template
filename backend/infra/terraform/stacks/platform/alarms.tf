# Destino de alarmas y avisos de costo. data, messaging y los servicios lo leen de este stack.

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  create_alarm_topic = var.alarm_email != null
  alarm_topic_arn    = local.create_alarm_topic ? aws_sns_topic.alarms[0].arn : var.alarm_topic_arn
}

# En staging y prod las alarmas y el presupuesto deben tener destino.
resource "terraform_data" "alarm_check" {
  lifecycle {
    precondition {
      condition     = !contains(["staging", "prod"], var.environment) || local.alarm_topic_arn != null
      error_message = "En staging y prod define alarm_email o alarm_topic_arn: las alarmas de DLQ, RDS y presupuesto necesitan destino."
    }

    precondition {
      condition     = var.monthly_budget == null || local.alarm_topic_arn != null
      error_message = "monthly_budget necesita alarm_email o alarm_topic_arn para enviar los avisos."
    }
  }
}

module "alarms_kms" {
  count  = local.create_alarm_topic ? 1 : 0
  source = "../../modules/kms-key"

  alias       = "${var.name_prefix}-alarms"
  description = "Cifrado del tópico de alarmas de ${var.name_prefix}"
  service_principals = [{
    sid      = "AllowAlarmPublishers"
    services = ["cloudwatch.amazonaws.com", "budgets.amazonaws.com"]
  }]
}

# Tópico propio cuando se indica un correo. La suscripción queda pendiente hasta que el
# destinatario confirme el mensaje de AWS.
resource "aws_sns_topic" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  name              = "${var.name_prefix}-alarms"
  kms_master_key_id = module.alarms_kms[0].arn
}

resource "aws_sns_topic_policy" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  arn = aws_sns_topic.alarms[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowAlarmPublishers"
      Effect    = "Allow"
      Principal = { Service = ["cloudwatch.amazonaws.com", "budgets.amazonaws.com"] }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.alarms[0].arn
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  })
}

resource "aws_sns_topic_subscription" "alarms_email" {
  count = local.create_alarm_topic ? 1 : 0

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

module "budget" {
  count  = var.monthly_budget == null ? 0 : 1
  source = "../../modules/budget"

  name_prefix      = var.name_prefix
  monthly_limit    = var.monthly_budget
  currency         = var.budget_currency
  sns_topic_arn    = local.alarm_topic_arn
  cost_filter_tags = var.budget_cost_filter_tags

  depends_on = [terraform_data.alarm_check, aws_sns_topic_policy.alarms]
}

moved {
  from = aws_kms_key.alarms[0]
  to   = module.alarms_kms[0].aws_kms_key.this
}

moved {
  from = aws_kms_alias.alarms[0]
  to   = module.alarms_kms[0].aws_kms_alias.this
}
