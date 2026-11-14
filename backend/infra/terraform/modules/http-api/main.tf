data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  name       = "${var.name_prefix}-api"
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  region     = data.aws_region.current.region

  access_log_group     = "/aws/apigateway/${local.name}"
  authorizer_function  = "${local.name}-origin-verify"
  authorizer_log_group = "/aws/lambda/${local.authorizer_function}"
  log_group_arn_base   = "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group"

  vpc_link_enabled = var.vpc_link != null
}

# --- KMS --------------------------------------------------------------------

resource "aws_kms_key" "this" {
  description             = "Cifrado de logs y del secreto de origen de ${local.name}"
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
            "kms:EncryptionContext:aws:logs:arn" = [
              "${local.log_group_arn_base}:${local.access_log_group}",
              "${local.log_group_arn_base}:${local.authorizer_log_group}",
            ]
          }
        }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.this.key_id
}

# --- API y stage --------------------------------------------------------------

resource "aws_apigatewayv2_api" "this" {
  name          = local.name
  protocol_type = "HTTP"
  description   = "API HTTP de ${var.name_prefix}. Cada servicio agrega sus rutas desde su stack."

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "access" {
  name              = local.access_log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.access.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      traceId            = "$context.requestHeader.traceparent"
      ip                 = "$context.identity.sourceIp"
      requestTime        = "$context.requestTime"
      httpMethod         = "$context.httpMethod"
      routeKey           = "$context.routeKey"
      status             = "$context.status"
      responseLength     = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
      integrationError   = "$context.integrationErrorMessage"
      authorizerError    = "$context.authorizer.error"
    })
  }

  tags = var.tags
}

# --- VPC link hacia el ALB interno de las APIs en Fargate ---------------------
# La salida del security group la declara quien conoce el ALB (stack platform).

resource "aws_security_group" "vpc_link" {
  count = local.vpc_link_enabled ? 1 : 0

  name        = "${local.name}-vpc-link"
  description = "VPC link de ${local.name} hacia el ALB interno"
  vpc_id      = var.vpc_link.vpc_id

  tags = merge(var.tags, { Name = "${local.name}-vpc-link" })
}

resource "aws_apigatewayv2_vpc_link" "this" {
  count = local.vpc_link_enabled ? 1 : 0

  name               = local.name
  subnet_ids         = var.vpc_link.subnet_ids
  security_group_ids = [aws_security_group.vpc_link[0].id]

  tags = var.tags
}

# --- Verificación de origen ----------------------------------------------------
# El secreto nunca llega al estado de este stack: la contraseña es efímera y se escribe
# con un atributo de solo escritura. El stack edge lo lee para configurar CloudFront.

ephemeral "random_password" "origin_verify" {
  count = var.origin_verify_enabled ? 1 : 0

  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "origin_verify" {
  count = var.origin_verify_enabled ? 1 : 0

  name                    = "${local.name}/origin-verify"
  description             = "Valor de X-Origin-Verify que CloudFront envía a ${local.name}"
  kms_key_id              = aws_kms_key.this.arn
  recovery_window_in_days = var.secret_recovery_window_days

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "origin_verify" {
  count = var.origin_verify_enabled ? 1 : 0

  secret_id                = aws_secretsmanager_secret.origin_verify[0].id
  secret_string_wo         = ephemeral.random_password.origin_verify[0].result
  secret_string_wo_version = var.origin_verify_secret_version
}

data "archive_file" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  type        = "zip"
  source_file = "${path.module}/authorizer/index.py"
  output_path = "${path.module}/.build/authorizer.zip"
}

resource "aws_cloudwatch_log_group" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  name              = local.authorizer_log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

resource "aws_iam_role" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  name = local.authorizer_function

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = local.account_id } }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  name = "origin-verify"
  role = aws_iam_role.authorizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "WriteLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.authorizer[0].arn}:*"
      },
      {
        Sid      = "ReadSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.origin_verify[0].arn
      },
      {
        Sid      = "DecryptSecret"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.this.arn
      },
    ]
  })
}

resource "aws_lambda_function" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  function_name = local.authorizer_function
  description   = "Verifica que la petición llegó por CloudFront"
  role          = aws_iam_role.authorizer[0].arn
  runtime       = "python3.13"
  architectures = ["arm64"]
  handler       = "index.handler"
  timeout       = 5
  memory_size   = 128

  filename         = data.archive_file.authorizer[0].output_path
  source_code_hash = data.archive_file.authorizer[0].output_base64sha256

  environment {
    variables = { ORIGIN_VERIFY_SECRET_ARN = aws_secretsmanager_secret.origin_verify[0].arn }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.authorizer[0].name
  }

  tracing_config {
    mode = "Active"
  }

  tags = var.tags

  depends_on = [aws_iam_role_policy.authorizer]
}

resource "aws_lambda_permission" "authorizer" {
  count = var.origin_verify_enabled ? 1 : 0

  statement_id  = "AllowApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/authorizers/*"
}

resource "aws_apigatewayv2_authorizer" "origin_verify" {
  count = var.origin_verify_enabled ? 1 : 0

  api_id                            = aws_apigatewayv2_api.this.id
  name                              = "origin-verify"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer[0].invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = ["$request.header.X-Origin-Verify"]
  authorizer_result_ttl_in_seconds  = 300
}
