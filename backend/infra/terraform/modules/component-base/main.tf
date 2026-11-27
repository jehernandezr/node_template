data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  full_name   = "${var.name_prefix}-${var.name}"
  account_id  = data.aws_caller_identity.current.account_id
  partition   = data.aws_partition.current.partition
  region      = data.aws_region.current.region
  fargate     = var.runtime == "fargate"
  lambda      = var.runtime == "lambda"
  log_group   = local.fargate ? "/ecs/${var.name_prefix}/${var.name}" : "/aws/lambda/${local.full_name}"
  create_key  = var.kms_key_arn == null
  kms_key_arn = local.create_key ? module.logs_kms[0].arn : var.kms_key_arn

  secret_base_arns = distinct([
    for v in var.secret_arns : regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v)
  ])
}

# --- Logs -------------------------------------------------------------------

module "logs_kms" {
  count  = local.create_key ? 1 : 0
  source = "../kms-key"

  alias              = "${local.full_name}-logs"
  description        = "Encryption of the logs of ${local.full_name}"
  log_group_arns     = ["arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:${local.log_group}"]
  service_principals = local.lambda ? [{ sid = "AllowSqsUse", services = ["sqs.amazonaws.com"] }] : []
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = local.kms_key_arn

  tags = var.tags
}

# --- Fargate roles ------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "execution" {
  count = local.fargate ? 1 : 0

  name               = "${local.full_name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  count = local.fargate ? 1 : 0

  role       = aws_iam_role.execution[0].name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = length(local.secret_base_arns) > 0 ? local.secret_base_arns : ["arn:${local.partition}:secretsmanager:${local.region}:${local.account_id}:secret:${local.full_name}-none"]
  }

  statement {
    sid       = "DecryptSecretsAndLogs"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = concat(var.secrets_kms_key_arns, [local.kms_key_arn])
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  count = local.fargate ? 1 : 0

  name   = "secrets"
  role   = aws_iam_role.execution[0].id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

resource "aws_iam_role" "task" {
  count = local.fargate ? 1 : 0

  name               = "${local.full_name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = var.tags
}

data "aws_iam_policy_document" "exec" {
  statement {
    sid       = "SsmMessages"
    actions   = ["ssmmessages:CreateControlChannel", "ssmmessages:CreateDataChannel", "ssmmessages:OpenControlChannel", "ssmmessages:OpenDataChannel"]
    resources = ["*"]
  }

  statement {
    sid       = "ExecLogs"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid       = "ExecLogStreams"
    actions   = ["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents"]
    resources = var.exec_log_group_arn == null ? ["arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:/ecs/*:*"] : ["${var.exec_log_group_arn}:*"]
  }

  statement {
    sid       = "ExecKey"
    actions   = ["kms:Decrypt"]
    resources = var.exec_kms_key_arn == null ? ["arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"] : [var.exec_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "exec" {
  count = local.fargate && var.enable_execute_command ? 1 : 0

  name   = "ecs-exec"
  role   = aws_iam_role.task[0].id
  policy = data.aws_iam_policy_document.exec.json
}

# --- Lambda role --------------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
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

resource "aws_iam_role" "function" {
  count = local.lambda ? 1 : 0

  name               = local.full_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json

  tags = var.tags
}

data "aws_iam_policy_document" "function" {
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.this.arn}:*"]
  }

  statement {
    sid       = "UseOwnKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [local.kms_key_arn]
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
    for_each = length(local.secret_base_arns) > 0 ? [1] : []

    content {
      sid       = "ReadSecrets"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = local.secret_base_arns
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

resource "aws_iam_role_policy" "function" {
  count = local.lambda ? 1 : 0

  name   = "base"
  role   = aws_iam_role.function[0].id
  policy = data.aws_iam_policy_document.function.json
}

resource "aws_iam_role_policy_attachment" "vpc" {
  count = local.lambda ? 1 : 0

  role       = aws_iam_role.function[0].name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# --- Component policies -------------------------------------------------------

resource "aws_iam_role_policy" "task" {
  for_each = var.task_policies

  name   = each.key
  role   = local.fargate ? aws_iam_role.task[0].id : aws_iam_role.function[0].id
  policy = each.value
}

# --- Network ------------------------------------------------------------------

resource "aws_security_group" "this" {
  name        = local.full_name
  description = "${local.fargate ? "Tasks" : "Lambda function"} of ${local.full_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = local.full_name })
}

# Outbound HTTPS through NAT or VPC endpoints (ADR 0016).
# trivy:ignore:AVD-AWS-0104
resource "aws_vpc_security_group_egress_rule" "https" {
  security_group_id = aws_security_group.this.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS to VPC endpoints and external services"
}
