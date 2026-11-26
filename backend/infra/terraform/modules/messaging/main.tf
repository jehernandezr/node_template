locals {
  topology       = jsondecode(file(var.topology_file))
  topics_by_name = { for t in local.topology.topics : t.name => t }
  queues_by_name = { for q in local.topology.queues : q.name => q }
  routes         = try(local.topology.routes, [])

  topic_names = { for name, t in local.topics_by_name : name => "${var.name_prefix}-${name}${t.fifo ? ".fifo" : ""}" }
  queue_names = { for name, q in local.queues_by_name : name => "${var.name_prefix}-${name}${q.fifo ? ".fifo" : ""}" }
  dlq_names   = { for name, q in local.queues_by_name : name => "${var.name_prefix}-${q.dlq.name}${q.fifo ? ".fifo" : ""}" }

  # One entry per queue-topic pair declared in the subscriptions.
  # A null or missing filterTypes means an empty list: no filter.
  subscriptions = {
    for pair in flatten([
      for q in local.topology.queues : [
        for s in q.subscriptions : {
          key          = "${q.name}|${s.topic}"
          queue        = q.name
          topic        = s.topic
          filter_types = try(s.filterTypes, null) == null ? tolist([]) : tolist(s.filterTypes)
        }
      ]
    ]) : pair.key => pair
  }

  # Queues with at least one subscription; the queue policy authorizes their topics.
  queue_topics = {
    for q in local.topology.queues : q.name => distinct([for s in q.subscriptions : s.topic])
    if length(q.subscriptions) > 0
  }

  # Per-service permissions derived from the exported topology: who publishes to each topic
  # (producers), who sends to each queue (producers) and who consumes it (consumer). The
  # service stacks build their IAM from this, without repeating names in the tfvars.
  topic_producers = { for t in local.topology.topics : t.name => try(tolist(t.producers), []) }
  queue_producers = { for q in local.topology.queues : q.name => try(tolist(q.producers), []) }
  queue_consumers = { for q in local.topology.queues : q.name => try(tostring(q.consumer), null) }

  topology_services = sort(distinct(compact(concat(
    flatten(values(local.topic_producers)),
    flatten(values(local.queue_producers)),
    values(local.queue_consumers),
  ))))

  service_access = {
    for svc in local.topology_services : svc => {
      publish_topics = sort([for name, producers in local.topic_producers : name if contains(producers, svc)])
      send_queues    = sort([for name, producers in local.queue_producers : name if contains(producers, svc)])
      consume_queues = sort([for name, consumer in local.queue_consumers : name if consumer == svc])
    }
  }
}

# Topology validations. A terraform_data with preconditions fails
# the plan with a clear message if the JSON is inconsistent.
resource "terraform_data" "topology_check" {
  input = local.topology

  lifecycle {
    precondition {
      condition = alltrue([
        for s in local.subscriptions : contains(keys(local.topics_by_name), s.topic)
      ])
      error_message = "A subscription points to a topic that is not declared in topics."
    }

    precondition {
      condition = alltrue([
        for r in local.routes : (r.kind == "event" && r.targetKind == "topic") || (r.kind == "command" && r.targetKind == "queue")
      ])
      error_message = "Each route must be kind event with targetKind topic, or kind command with targetKind queue."
    }

    precondition {
      condition = alltrue([
        for r in local.routes : (
          r.targetKind == "topic" ? contains(keys(local.topics_by_name), r.target) :
          r.targetKind == "queue" ? contains(keys(local.queues_by_name), r.target) :
          false
        )
      ])
      error_message = "Each route target must be a declared topic if targetKind is topic, or a declared queue if targetKind is queue."
    }

    precondition {
      condition     = alltrue([for q in local.topology.queues : q.dlq.retentionSeconds <= 1209600])
      error_message = "dlq.retentionSeconds cannot exceed 1209600 (14 days)."
    }

    precondition {
      condition     = alltrue([for n in concat(values(local.queue_names), values(local.dlq_names)) : length(n) <= 80])
      error_message = "Final queue and DLQ names, with prefix and .fifo, cannot exceed 80 characters."
    }
  }
}

module "kms" {
  source = "../kms-key"

  alias       = "${var.name_prefix}-messaging"
  description = "Encryption of the topics and queues of ${var.name_prefix}"
  service_principals = [
    { sid = "AllowSnsUse", services = ["sns.amazonaws.com"] },
    { sid = "AllowSqsUse", services = ["sqs.amazonaws.com"] },
  ]
  tags = var.tags
}

resource "aws_sns_topic" "this" {
  for_each = local.topics_by_name

  name                        = local.topic_names[each.key]
  fifo_topic                  = each.value.fifo
  content_based_deduplication = each.value.fifo
  kms_master_key_id           = module.kms.arn

  tags = merge(var.tags, { Name = each.key })

  depends_on = [terraform_data.topology_check]
}

resource "aws_sqs_queue" "dlq" {
  for_each = local.queues_by_name

  name                              = local.dlq_names[each.key]
  fifo_queue                        = each.value.fifo
  content_based_deduplication       = each.value.fifo
  message_retention_seconds         = each.value.dlq.retentionSeconds
  kms_master_key_id                 = module.kms.arn
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  tags = merge(var.tags, { Name = "${each.key}-dlq", Role = "dlq" })

  depends_on = [terraform_data.topology_check]
}

resource "aws_sqs_queue" "this" {
  for_each = local.queues_by_name

  name                              = local.queue_names[each.key]
  fifo_queue                        = each.value.fifo
  content_based_deduplication       = each.value.fifo
  visibility_timeout_seconds        = each.value.visibilityTimeoutSeconds
  kms_master_key_id                 = module.kms.arn
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  # The application dispatcher uses maxAttempts for backoff. Terraform sets it as a tag.
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = coalesce(var.max_receive_count, each.value.dlq.maxReceiveCount)
  })

  tags = merge(var.tags, {
    Name        = each.key
    MaxAttempts = tostring(each.value.maxAttempts)
  })

  depends_on = [terraform_data.topology_check]
}

resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  for_each = var.redrive_allow_policy_enabled ? local.queues_by_name : {}

  queue_url = aws_sqs_queue.dlq[each.key].url

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.this[each.key].arn]
  })
}

# Every queue requires TLS. Queues with subscriptions also authorize their topics.
resource "aws_sqs_queue_policy" "this" {
  for_each = local.queues_by_name

  queue_url = aws_sqs_queue.this[each.key].url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [{
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "sqs:*"
        Resource  = aws_sqs_queue.this[each.key].arn
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      }],
      contains(keys(local.queue_topics), each.key) ? [{
        Sid       = "AllowSnsTopics"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.this[each.key].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [for t in local.queue_topics[each.key] : aws_sns_topic.this[t].arn]
          }
        }
      }] : [],
    )
  })
}

resource "aws_sns_topic_subscription" "this" {
  for_each = local.subscriptions

  topic_arn            = aws_sns_topic.this[each.value.topic].arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.this[each.value.queue].arn
  raw_message_delivery = true

  # The filter reads the type field from the CloudEvents message body.
  filter_policy_scope = "MessageBody"
  filter_policy = length(each.value.filter_types) > 0 ? jsonencode({
    type = each.value.filter_types
  }) : null

  depends_on = [aws_sqs_queue_policy.this]
}

resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  for_each = var.alarms_enabled ? local.queues_by_name : {}

  alarm_name          = "${local.dlq_names[each.key]}-not-empty"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq[each.key].name
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = var.tags
}

# Messages stuck in the DLQ: nobody reprocesses them (redrive) within the time limit.
resource "aws_cloudwatch_metric_alarm" "dlq_old_message" {
  for_each = var.alarms_enabled ? local.queues_by_name : {}

  alarm_name          = "${local.dlq_names[each.key]}-oldest-message-age"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.dlq_oldest_message_age_seconds
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq[each.key].name
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = var.tags
}

# Stopped or slow consumer: the oldest message in the main queue exceeds the threshold.
resource "aws_cloudwatch_metric_alarm" "queue_old_message" {
  for_each = var.alarms_enabled ? local.queues_by_name : {}

  alarm_name          = "${local.queue_names[each.key]}-oldest-message-age"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.queue_oldest_message_age_seconds
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.this[each.key].name
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = var.tags
}

moved {
  from = aws_kms_key.messaging
  to   = module.kms.aws_kms_key.this
}

moved {
  from = aws_kms_alias.messaging
  to   = module.kms.aws_kms_alias.this
}
