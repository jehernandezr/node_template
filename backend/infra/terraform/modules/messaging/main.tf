data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  topology       = jsondecode(file(var.topology_file))
  topics_by_name = { for t in local.topology.topics : t.name => t }
  queues_by_name = { for q in local.topology.queues : q.name => q }
  routes         = try(local.topology.routes, [])

  topic_names = { for name, t in local.topics_by_name : name => "${var.name_prefix}-${name}${t.fifo ? ".fifo" : ""}" }
  queue_names = { for name, q in local.queues_by_name : name => "${var.name_prefix}-${name}${q.fifo ? ".fifo" : ""}" }
  dlq_names   = { for name, q in local.queues_by_name : name => "${var.name_prefix}-${q.dlq.name}${q.fifo ? ".fifo" : ""}" }

  # Una entrada por cada par cola-tópico declarado en las suscripciones.
  # filterTypes null o ausente equivale a lista vacía: sin filtro.
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

  # Colas con al menos una suscripción; la política de la cola autoriza a sus tópicos.
  queue_topics = {
    for q in local.topology.queues : q.name => distinct([for s in q.subscriptions : s.topic])
    if length(q.subscriptions) > 0
  }

  # Permisos por servicio derivados de la topología exportada: quién publica en cada tópico
  # (producers), quién envía a cada cola (producers) y quién la consume (consumer). Los
  # stacks de servicio arman su IAM con esto, sin repetir nombres en los tfvars.
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

# Validaciones de la topología. Un terraform_data con precondiciones falla
# el plan con un mensaje claro si el JSON no es coherente.
resource "terraform_data" "topology_check" {
  input = local.topology

  lifecycle {
    precondition {
      condition = alltrue([
        for s in local.subscriptions : contains(keys(local.topics_by_name), s.topic)
      ])
      error_message = "Una suscripción apunta a un tópico que no está declarado en topics."
    }

    precondition {
      condition = alltrue([
        for r in local.routes : (r.kind == "event" && r.targetKind == "topic") || (r.kind == "command" && r.targetKind == "queue")
      ])
      error_message = "Cada ruta debe ser kind event con targetKind topic, o kind command con targetKind queue."
    }

    precondition {
      condition = alltrue([
        for r in local.routes : (
          r.targetKind == "topic" ? contains(keys(local.topics_by_name), r.target) :
          r.targetKind == "queue" ? contains(keys(local.queues_by_name), r.target) :
          false
        )
      ])
      error_message = "El target de cada ruta debe ser un tópico declarado si targetKind es topic, o una cola declarada si targetKind es queue."
    }

    precondition {
      condition     = alltrue([for q in local.topology.queues : q.dlq.retentionSeconds <= 1209600])
      error_message = "dlq.retentionSeconds no puede superar 1209600 (14 días)."
    }

    precondition {
      condition     = alltrue([for n in concat(values(local.queue_names), values(local.dlq_names)) : length(n) <= 80])
      error_message = "Los nombres finales de colas y DLQ, con prefijo y .fifo, no pueden superar 80 caracteres."
    }
  }
}

resource "aws_kms_key" "messaging" {
  description             = "Cifrado de tópicos y colas de ${var.name_prefix}"
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
        Sid       = "AllowSnsUse"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = ["kms:GenerateDataKey*", "kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
      {
        Sid       = "AllowSqsUse"
        Effect    = "Allow"
        Principal = { Service = "sqs.amazonaws.com" }
        Action    = ["kms:GenerateDataKey*", "kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "messaging" {
  name          = "alias/${var.name_prefix}-messaging"
  target_key_id = aws_kms_key.messaging.key_id
}

resource "aws_sns_topic" "this" {
  for_each = local.topics_by_name

  name                        = local.topic_names[each.key]
  fifo_topic                  = each.value.fifo
  content_based_deduplication = each.value.fifo
  kms_master_key_id           = aws_kms_key.messaging.arn

  tags = merge(var.tags, { Name = each.key })

  depends_on = [terraform_data.topology_check]
}

resource "aws_sqs_queue" "dlq" {
  for_each = local.queues_by_name

  name                              = local.dlq_names[each.key]
  fifo_queue                        = each.value.fifo
  content_based_deduplication       = each.value.fifo
  message_retention_seconds         = each.value.dlq.retentionSeconds
  kms_master_key_id                 = aws_kms_key.messaging.arn
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
  kms_master_key_id                 = aws_kms_key.messaging.arn
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  # maxAttempts lo usa el dispatcher de la aplicación para el backoff. Terraform lo etiqueta.
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

# Toda cola exige TLS. Las que tienen suscripciones también autorizan a sus tópicos.
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

  # El filtro lee el campo type del cuerpo del mensaje CloudEvents.
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

# Mensajes atascados en la DLQ: nadie los reprocesa (redrive) dentro del plazo.
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

# Consumidor detenido o lento: el mensaje más viejo de la cola principal supera el umbral.
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
