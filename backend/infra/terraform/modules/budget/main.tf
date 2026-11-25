# Monthly cost budget with notifications to the alarms topic. The topic must allow
# budgets.amazonaws.com to publish (and its CMK must allow it to use the key).

resource "aws_budgets_budget" "this" {
  name         = "${var.name_prefix}-monthly"
  budget_type  = "COST"
  limit_amount = format("%.2f", var.monthly_limit)
  limit_unit   = var.currency
  time_unit    = "MONTHLY"

  dynamic "cost_filter" {
    for_each = var.cost_filter_tags

    content {
      name   = "TagKeyValue"
      values = ["user:${cost_filter.key}$${cost_filter.value}"]
    }
  }

  dynamic "notification" {
    for_each = var.notifications

    content {
      comparison_operator       = "GREATER_THAN"
      threshold                 = notification.value.threshold_percent
      threshold_type            = "PERCENTAGE"
      notification_type         = notification.value.type
      subscriber_sns_topic_arns = [var.sns_topic_arn]
    }
  }

  tags = var.tags
}
