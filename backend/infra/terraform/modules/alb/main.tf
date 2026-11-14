data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  base_name        = "${var.name_prefix}-${var.name}"
  logs_bucket_name = "${local.base_name}-logs-${data.aws_caller_identity.current.account_id}"
  tls              = var.certificate_arn != null
  # Puerto de entrada: 443 con certificado; 80 solo en un ALB interno sin certificado.
  listener_port = local.tls ? 443 : 80
}

resource "terraform_data" "input_check" {
  input = local.base_name

  lifecycle {
    precondition {
      condition     = var.internal || local.tls
      error_message = "Un ALB internet-facing requiere certificate_arn: solo un ALB interno puede escuchar en HTTP."
    }
  }
}

# Los access logs del ALB solo admiten cifrado SSE-S3; ELB no puede usar una CMK de KMS.
resource "aws_s3_bucket" "logs" {
  bucket        = local.logs_bucket_name
  force_destroy = var.access_logs_force_destroy

  tags = merge(var.tags, { Name = local.logs_bucket_name })
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Los access logs del ALB solo admiten SSE-S3, no KMS.
# trivy:ignore:AVD-AWS-0132
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-access-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = var.access_logs_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAlbLogDelivery"
        Effect    = "Allow"
        Principal = { Service = "logdelivery.elasticloadbalancing.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.logs.arn, "${aws_s3_bucket.logs.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.logs]
}

resource "aws_security_group" "this" {
  name        = local.base_name
  description = "ALB ${var.internal ? "interno" : "público"} ${local.base_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = local.base_name })
}

# La salida hacia cada servicio la declara service-fargate al conectar su target group.
resource "aws_vpc_security_group_ingress_rule" "https_ipv4" {
  for_each = toset(var.ingress_cidr_blocks)

  security_group_id = aws_security_group.this.id
  cidr_ipv4         = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = local.tls ? "HTTPS" : "HTTP dentro de la VPC"
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv4" {
  for_each = local.tls ? toset(var.ingress_cidr_blocks) : toset([])

  security_group_id = aws_security_group.this.id
  cidr_ipv4         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP, solo para la redirección a HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "https_ipv6" {
  for_each = toset(var.ingress_ipv6_cidr_blocks)

  security_group_id = aws_security_group.this.id
  cidr_ipv6         = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = local.tls ? "HTTPS" : "HTTP dentro de la VPC"
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv6" {
  for_each = local.tls ? toset(var.ingress_ipv6_cidr_blocks) : toset([])

  security_group_id = aws_security_group.this.id
  cidr_ipv6         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP, solo para la redirección a HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "https_prefix_list" {
  for_each = toset(var.ingress_prefix_list_ids)

  security_group_id = aws_security_group.this.id
  prefix_list_id    = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = "Entrada desde una prefix list"
}

# Entrada desde otros security groups, por ejemplo el VPC link de API Gateway hacia un ALB interno.
resource "aws_vpc_security_group_ingress_rule" "from_security_group" {
  count = length(var.ingress_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.ingress_security_group_ids[count.index]
  from_port                    = local.listener_port
  to_port                      = local.listener_port
  ip_protocol                  = "tcp"
  description                  = "Entrada desde un security group autorizado"
}

# El ALB público es la entrada del tiempo real (Socket.IO y SSE). El interno solo es
# alcanzable dentro de la VPC (VPC link de API Gateway).
# trivy:ignore:AVD-AWS-0053
resource "aws_lb" "this" {
  name               = local.base_name
  load_balancer_type = "application"
  internal           = var.internal
  security_groups    = [aws_security_group.this.id]
  subnets            = var.subnet_ids

  idle_timeout               = var.idle_timeout_seconds
  enable_deletion_protection = var.deletion_protection
  drop_invalid_header_fields = var.drop_invalid_header_fields
  enable_http2               = true
  desync_mitigation_mode     = "strictest"

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = merge(var.tags, { Name = local.base_name })

  depends_on = [aws_s3_bucket_policy.logs, terraform_data.input_check]
}

resource "aws_lb_target_group" "this" {
  for_each = var.target_groups

  name                 = "${var.name_prefix}-${each.key}"
  port                 = each.value.port
  protocol             = each.value.protocol
  target_type          = each.value.target_type
  vpc_id               = var.vpc_id
  deregistration_delay = each.value.deregistration_delay
  slow_start           = each.value.slow_start

  load_balancing_cross_zone_enabled = each.value.load_balancing_cross_zone

  # Sin sesiones pegajosas: Socket.IO usa solo WebSocket y Valkey comparte el estado.
  stickiness {
    type    = "lb_cookie"
    enabled = false
  }

  health_check {
    path                = each.value.health_check_path
    matcher             = each.value.health_check_matcher
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-${each.key}" })
}

# Con certificado, el listener HTTP solo redirige a HTTPS. Sin certificado (ALB interno detrás
# del VPC link de API Gateway) atiende en HTTP dentro de la VPC; el TLS termina en CloudFront
# y en API Gateway.
# trivy:ignore:AVD-AWS-0054
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = local.tls ? [1] : []

    content {
      type = "redirect"

      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.tls ? [] : [1]

    content {
      type = "fixed-response"

      fixed_response {
        content_type = "application/json"
        message_body = "{\"message\":\"not found\"}"
        status_code  = "404"
      }
    }
  }

  tags = var.tags
}

resource "aws_lb_listener" "https" {
  count = local.tls ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  dynamic "default_action" {
    for_each = var.default_target_group_key == null ? [1] : []

    content {
      type = "fixed-response"

      fixed_response {
        content_type = "application/json"
        message_body = "{\"message\":\"not found\"}"
        status_code  = "404"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.default_target_group_key == null ? [] : [1]

    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.this[var.default_target_group_key].arn
    }
  }

  tags = var.tags
}

resource "aws_lb_listener_certificate" "additional" {
  for_each = local.tls ? toset(var.additional_certificate_arns) : toset([])

  listener_arn    = aws_lb_listener.https[0].arn
  certificate_arn = each.value
}
