# Destination for alarms and cost notices. data, messaging and the services read it from this stack.

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  create_alarm_topic = var.alarm_email != null
  alarm_topic_arn    = local.create_alarm_topic ? aws_sns_topic.alarms[0].arn : var.alarm_topic_arn
}

# In staging and prod the alarms and the budget must have a destination.
resource "terraform_data" "alarm_check" {
  lifecycle {
    precondition {
      condition     = !contains(["staging", "prod"], var.environment) || local.alarm_topic_arn != null
      error_message = "In staging and prod set alarm_email or alarm_topic_arn: the DLQ, RDS and budget alarms need a destination."
    }

    precondition {
      condition     = var.monthly_budget == null || local.alarm_topic_arn != null
      error_message = "monthly_budget needs alarm_email or alarm_topic_arn to send the notices."
    }
  }
}

module "alarms_kms" {
  count  = local.create_alarm_topic ? 1 : 0
  source = "../../modules/kms-key"

  alias       = "${var.name_prefix}-alarms"
  description = "Encryption of the alarms topic of ${var.name_prefix}"
  service_principals = [{
    sid      = "AllowAlarmPublishers"
    services = ["cloudwatch.amazonaws.com", "budgets.amazonaws.com"]
  }]
}

# Dedicated topic when an email is given. The subscription stays pending until the
# recipient confirms the AWS message.
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
