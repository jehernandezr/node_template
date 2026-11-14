# Rutas de un servicio en la API HTTP compartida. El runtime solo cambia la integración:
# Lambda (AWS_PROXY) o Fargate detrás del ALB interno (HTTP_PROXY por el VPC link).

locals {
  is_lambda = var.target.type == "lambda"

  # Cada prefijo atiende su raíz y todo lo que cuelga de ella.
  route_keys = toset(flatten([
    for prefix in var.route_prefixes : ["ANY ${prefix}", "ANY ${prefix}/{proxy+}"]
  ]))
}

resource "terraform_data" "input_check" {
  input = var.name

  lifecycle {
    precondition {
      condition     = !local.is_lambda || (var.target.lambda_function_name != null && var.target.lambda_invoke_arn != null)
      error_message = "Un destino lambda requiere lambda_function_name y lambda_invoke_arn."
    }

    precondition {
      condition     = local.is_lambda || (var.target.vpc_link_id != null && var.target.listener_arn != null)
      error_message = "Un destino vpc_link requiere vpc_link_id y listener_arn del ALB interno."
    }
  }
}

resource "aws_apigatewayv2_integration" "this" {
  api_id      = var.api_id
  description = "API de ${var.name}"

  integration_type       = local.is_lambda ? "AWS_PROXY" : "HTTP_PROXY"
  integration_method     = local.is_lambda ? "POST" : "ANY"
  integration_uri        = local.is_lambda ? var.target.lambda_invoke_arn : var.target.listener_arn
  connection_type        = local.is_lambda ? "INTERNET" : "VPC_LINK"
  connection_id          = local.is_lambda ? null : var.target.vpc_link_id
  payload_format_version = local.is_lambda ? "2.0" : "1.0"
  timeout_milliseconds   = var.timeout_milliseconds

  depends_on = [terraform_data.input_check]
}

resource "aws_apigatewayv2_route" "this" {
  for_each = local.route_keys

  api_id             = var.api_id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.this.id}"
  authorization_type = var.authorizer_id == null ? "NONE" : "CUSTOM"
  authorizer_id      = var.authorizer_id
}

resource "aws_lambda_permission" "this" {
  count = local.is_lambda ? 1 : 0

  statement_id  = "AllowHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = var.target.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_execution_arn}/*/*"
}
