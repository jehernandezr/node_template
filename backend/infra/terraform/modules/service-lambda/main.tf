data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  full_name   = "${var.name_prefix}-${var.function_name}"
  account_id  = data.aws_caller_identity.current.account_id
  partition   = data.aws_partition.current.partition
  region      = data.aws_region.current.region
  log_group   = "/aws/lambda/${local.full_name}"
  create_key  = var.kms_key_arn == null
  kms_key_arn = local.create_key ? aws_kms_key.this[0].arn : var.kms_key_arn

  otel_env = var.otel_layer_arn == null ? {} : merge(
    {
      AWS_LAMBDA_EXEC_WRAPPER     = "/opt/otel-handler"
      OTEL_SERVICE_NAME           = var.function_name
      OTEL_RESOURCE_ATTRIBUTES    = "service.namespace=${var.name_prefix},deployment.environment=${var.environment}"
      OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf"
      OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318"
    },
    var.otel_collector_config_uri == null ? {} : { OPENTELEMETRY_COLLECTOR_CONFIG_URI = var.otel_collector_config_uri }
  )

  function_environment = merge(
    local.otel_env,
    { LOG_LEVEL = lower(var.application_log_level), SERVICE_NAME = var.function_name },
    var.environment_variables,
  )

  layers = compact(concat([var.otel_layer_arn], var.layers))
}

resource "terraform_data" "input_check" {
  input = local.full_name

  lifecycle {
    precondition {
      condition     = (var.filename != null) != (var.s3_bucket != null && var.s3_key != null)
      error_message = "Indica el paquete con filename o con s3_bucket y s3_key, no ambos."
    }

    precondition {
      condition     = !var.vpc_enabled || (var.vpc_id != null && length(var.subnet_ids) > 0)
      error_message = "vpc_enabled requiere vpc_id y subnet_ids."
    }
  }
}

# --- KMS, logs y DLQ --------------------------------------------------------

resource "aws_kms_key" "this" {
  count = local.create_key ? 1 : 0

  description             = "Cifrado de ${local.full_name}: variables de entorno, logs y DLQ"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableIamPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:${local.partition}:iam::${local.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowCloudWatchLogs"
        Effect    = "Allow"
        Principal = { Service = "logs.${local.region}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:${local.log_group}"
          }
        }
      },
      {
        Sid       = "AllowSqsUse"
        Effect    = "Allow"
        Principal = { Service = "sqs.amazonaws.com" }
        Action    = ["kms:GenerateDataKey*", "kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = local.account_id } }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  count = local.create_key ? 1 : 0

  name          = "alias/${local.full_name}"
  target_key_id = aws_kms_key.this[0].key_id
}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = local.kms_key_arn

  tags = var.tags
}

# Cola de mensajes fallidos de invocaciones asíncronas. Los mensajes de SQS que fallan
# van a la DLQ de la cola de origen, que define el módulo messaging.
resource "aws_sqs_queue" "dlq" {
  name                      = "${local.full_name}-async-dlq"
  message_retention_seconds = var.async_dlq_retention_seconds
  kms_master_key_id         = local.kms_key_arn

  tags = merge(var.tags, { Name = "${local.full_name}-async-dlq", Role = "dlq" })
}

# --- IAM --------------------------------------------------------------------

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = local.full_name
  assume_role_policy = data.aws_iam_policy_document.assume.json

  tags = var.tags
}

data "aws_iam_policy_document" "base" {
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.this.arn}:*"]
  }

  dynamic "statement" {
    for_each = var.queue_arn == null ? [] : [var.queue_arn]

    content {
      sid       = "ConsumeQueue"
      actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
      resources = [statement.value]
    }
  }

  statement {
    sid       = "SendToAsyncDlq"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.dlq.arn]
  }

  statement {
    sid       = "UseOwnKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [local.kms_key_arn]
  }

  dynamic "statement" {
    for_each = var.queue_arn == null || var.queue_kms_key_arn == null ? [] : [1]

    content {
      sid       = "DecryptQueue"
      actions   = ["kms:Decrypt"]
      resources = [var.queue_kms_key_arn]
    }
  }

  dynamic "statement" {
    for_each = var.tracing_mode == "Active" ? [1] : []

    content {
      sid       = "XRay"
      actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
      resources = ["*"]
    }
  }

  dynamic "statement" {
    for_each = length(var.secret_arns) > 0 ? [1] : []

    content {
      sid       = "ReadSecrets"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = var.secret_arns
    }
  }

  dynamic "statement" {
    for_each = length(var.secrets_kms_key_arns) > 0 ? [1] : []

    content {
      sid       = "DecryptSecrets"
      actions   = ["kms:Decrypt"]
      resources = var.secrets_kms_key_arns
    }
  }
}

resource "aws_iam_role_policy" "base" {
  name   = "base"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.base.json
}

resource "aws_iam_role_policy" "extra" {
  for_each = var.task_policies

  name   = each.key
  role   = aws_iam_role.this.id
  policy = each.value
}

resource "aws_iam_role_policy_attachment" "vpc" {
  count = var.vpc_enabled ? 1 : 0

  role       = aws_iam_role.this.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# --- Red --------------------------------------------------------------------

resource "aws_security_group" "this" {
  count = var.vpc_enabled ? 1 : 0

  name        = local.full_name
  description = "Función Lambda ${local.full_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = local.full_name })
}

# HTTPS saliente por NAT o endpoints de VPC (ADR 0016).
# trivy:ignore:AVD-AWS-0104
resource "aws_vpc_security_group_egress_rule" "https" {
  count = var.vpc_enabled ? 1 : 0

  security_group_id = aws_security_group.this[0].id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS hacia endpoints de VPC y servicios externos"
}

# --- Función y origen de eventos --------------------------------------------

resource "aws_lambda_function" "this" {
  function_name = local.full_name
  description   = var.description
  role          = aws_iam_role.this.arn
  handler       = var.handler
  runtime       = var.runtime
  architectures = ["arm64"]
  memory_size   = var.memory_size
  timeout       = var.timeout
  layers        = local.layers

  filename          = var.filename
  s3_bucket         = var.s3_bucket
  s3_key            = var.s3_key
  s3_object_version = var.s3_object_version
  source_code_hash  = var.source_code_hash

  reserved_concurrent_executions = var.reserved_concurrent_executions
  kms_key_arn                    = local.kms_key_arn

  environment {
    variables = local.function_environment
  }

  tracing_config {
    mode = var.tracing_mode
  }

  logging_config {
    log_format            = "JSON"
    log_group             = aws_cloudwatch_log_group.this.name
    application_log_level = var.application_log_level
    system_log_level      = "WARN"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  dynamic "vpc_config" {
    for_each = var.vpc_enabled ? [1] : []

    content {
      subnet_ids         = var.subnet_ids
      security_group_ids = concat([aws_security_group.this[0].id], var.additional_security_group_ids)
    }
  }

  tags = merge(var.tags, { Name = local.full_name })

  depends_on = [
    terraform_data.input_check,
    aws_iam_role_policy.base,
    aws_iam_role_policy_attachment.vpc,
  ]
}

resource "aws_lambda_event_source_mapping" "sqs" {
  count = var.queue_arn == null ? 0 : 1

  event_source_arn                   = var.queue_arn
  function_name                      = aws_lambda_function.this.arn
  enabled                            = var.event_source_enabled
  batch_size                         = var.batch_size
  maximum_batching_window_in_seconds = var.maximum_batching_window_seconds
  function_response_types            = ["ReportBatchItemFailures"]

  dynamic "scaling_config" {
    for_each = var.maximum_concurrency == null ? [] : [1]

    content {
      maximum_concurrency = var.maximum_concurrency
    }
  }

  dynamic "filter_criteria" {
    for_each = length(var.filter_patterns) > 0 ? [1] : []

    content {
      dynamic "filter" {
        for_each = var.filter_patterns

        content {
          pattern = filter.value
        }
      }
    }
  }
}

# --- Alarmas ----------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "${local.full_name}-errors"
  alarm_description   = "Errores de invocación en ${local.full_name}"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "async_dlq_not_empty" {
  alarm_name          = "${local.full_name}-async-dlq-not-empty"
  alarm_description   = "Hay invocaciones asíncronas fallidas en la DLQ de ${local.full_name}"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = var.tags
}
