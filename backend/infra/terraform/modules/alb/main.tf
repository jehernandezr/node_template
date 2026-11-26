data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  base_name        = "${var.name_prefix}-${var.name}"
  logs_bucket_name = "${local.base_name}-logs-${data.aws_caller_identity.current.account_id}"
  tls              = var.certificate_arn != null
  # Listener port: 443 with a certificate; 80 only on an internal ALB without a certificate.
  listener_port = local.tls ? 443 : 80
}

resource "terraform_data" "input_check" {
  input = local.base_name

  lifecycle {
    precondition {
      condition     = var.internal || local.tls
      error_message = "An internet-facing ALB requires certificate_arn: only an internal ALB can listen on HTTP."
    }
  }
}

# ALB access logs only support SSE-S3 encryption; ELB cannot use a KMS CMK.
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

# ALB access logs only support SSE-S3, not KMS.
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
  description = "${var.internal ? "Internal" : "Public"} ALB ${local.base_name}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = local.base_name })
}

# Egress to each service is declared by service-fargate when it attaches its target group.
resource "aws_vpc_security_group_ingress_rule" "https_ipv4" {
  for_each = toset(var.ingress_cidr_blocks)

  security_group_id = aws_security_group.this.id
  cidr_ipv4         = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = local.tls ? "HTTPS" : "HTTP inside the VPC"
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv4" {
  for_each = local.tls ? toset(var.ingress_cidr_blocks) : toset([])

  security_group_id = aws_security_group.this.id
  cidr_ipv4         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP, only for the redirect to HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "https_ipv6" {
  for_each = toset(var.ingress_ipv6_cidr_blocks)

  security_group_id = aws_security_group.this.id
  cidr_ipv6         = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = local.tls ? "HTTPS" : "HTTP inside the VPC"
}

resource "aws_vpc_security_group_ingress_rule" "http_ipv6" {
  for_each = local.tls ? toset(var.ingress_ipv6_cidr_blocks) : toset([])

  security_group_id = aws_security_group.this.id
  cidr_ipv6         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP, only for the redirect to HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "https_prefix_list" {
  for_each = toset(var.ingress_prefix_list_ids)

  security_group_id = aws_security_group.this.id
  prefix_list_id    = each.value
  from_port         = local.listener_port
  to_port           = local.listener_port
  ip_protocol       = "tcp"
  description       = "Ingress from a prefix list"
}

# Ingress from other security groups, for example the API Gateway VPC link to an internal ALB.
resource "aws_vpc_security_group_ingress_rule" "from_security_group" {
  count = length(var.ingress_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.ingress_security_group_ids[count.index]
  from_port                    = local.listener_port
  to_port                      = local.listener_port
  ip_protocol                  = "tcp"
  description                  = "Ingress from an authorized security group"
}

# The public ALB is the entry point for real-time traffic (Socket.IO and SSE). The internal one is only
# reachable inside the VPC (API Gateway VPC link).
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

  # No sticky sessions: Socket.IO uses only WebSocket and Valkey shares the state.
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

# With a certificate, the HTTP listener only redirects to HTTPS. Without a certificate (internal ALB
# behind the API Gateway VPC link) it serves HTTP inside the VPC; TLS terminates at CloudFront
# and at API Gateway.
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
