data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  partition    = data.aws_partition.current.partition
  create_api   = var.api_origin_domain_name != null
  web_bucket   = "${var.name_prefix}-web-${local.account_id}"
  web_origin   = "web-s3"
  api_origin   = "api"
  waf_log_name = "aws-waf-logs-${var.name_prefix}"

  # Ámbito de las reglas administradas: block usa la acción propia de la regla,
  # count la reemplaza para observar sin bloquear.
  managed_rules = {
    common = { name = "AWSManagedRulesCommonRuleSet", priority = 10 }
    bad    = { name = "AWSManagedRulesKnownBadInputsRuleSet", priority = 20 }
    ip     = { name = "AWSManagedRulesAmazonIpReputationList", priority = 30 }
    sqli   = { name = "AWSManagedRulesSQLiRuleSet", priority = 40 }
  }
}

# --- Bucket de la web -------------------------------------------------------

resource "aws_kms_key" "web" {
  description             = "Cifrado del bucket web de ${var.name_prefix}"
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
        # Se limita por cuenta y no por distribución para evitar una dependencia circular.
        Sid       = "AllowCloudFrontDecrypt"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = ["kms:Decrypt", "kms:GenerateDataKey*"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = local.account_id } }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "web" {
  name          = "alias/${var.name_prefix}-web"
  target_key_id = aws_kms_key.web.key_id
}

resource "aws_s3_bucket" "web" {
  bucket        = local.web_bucket
  force_destroy = var.web_force_destroy

  tags = merge(var.tags, { Name = local.web_bucket })
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.web.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.web]
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.web.arn}/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.web.arn } }
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.web.arn, "${aws_s3_bucket.web.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.web]
}

# --- Políticas compartidas --------------------------------------------------

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${var.name_prefix}-web"
  description                       = "OAC del bucket web de ${var.name_prefix}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.name_prefix}-security-headers"
  comment = "Cabeceras de seguridad de ${var.name_prefix}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = var.hsts_max_age_seconds
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    dynamic "content_security_policy" {
      for_each = var.content_security_policy == null ? [] : [1]

      content {
        content_security_policy = var.content_security_policy
        override                = true
      }
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}

# Reenvía al origen lo necesario para la API: todas las cabeceras del cliente salvo Host,
# más los encabezados de geolocalización que usa el contexto de MFA.
resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.name_prefix}-api"
  comment = "Cabeceras, cookies y query strings hacia la API con geolocalización"

  headers_config {
    header_behavior = "allViewerAndWhitelistCloudFront"

    headers {
      items = [
        "CloudFront-Viewer-Country",
        "CloudFront-Viewer-Country-Region",
        "CloudFront-Viewer-City",
        "CloudFront-Viewer-Latitude",
        "CloudFront-Viewer-Longitude",
        "CloudFront-Viewer-Time-Zone",
        "CloudFront-Viewer-Address",
      ]
    }
  }

  cookies_config {
    cookie_behavior = "all"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# --- Distribución de la web -------------------------------------------------

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  comment             = "${var.name_prefix} web"
  default_root_object = var.web_default_root_object
  aliases             = var.web_aliases
  price_class         = var.price_class
  web_acl_id          = aws_wafv2_web_acl.this.arn

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = local.web_origin
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_cache_behavior {
    target_origin_id           = local.web_origin
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # Fallback de SPA: las rutas del cliente devuelven index.html.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/${var.web_default_root_object}"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/${var.web_default_root_object}"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  dynamic "logging_config" {
    for_each = var.logging_bucket_domain_name == null ? [] : [1]

    content {
      bucket          = var.logging_bucket_domain_name
      prefix          = "web/"
      include_cookies = false
    }
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-web" })
}

# --- Distribución de la API -------------------------------------------------

resource "aws_cloudfront_distribution" "api" {
  count = local.create_api ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  comment         = "${var.name_prefix} api"
  aliases         = var.api_aliases
  price_class     = var.price_class
  web_acl_id      = aws_wafv2_web_acl.this.arn

  origin {
    domain_name = var.api_origin_domain_name
    origin_id   = local.api_origin

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = var.api_origin_read_timeout
      origin_keepalive_timeout = 60
    }

    dynamic "custom_header" {
      for_each = var.api_origin_verify_header_value == null ? [] : [1]

      content {
        name  = "X-Origin-Verify"
        value = var.api_origin_verify_header_value
      }
    }
  }

  default_cache_behavior {
    target_origin_id           = local.api_origin
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  dynamic "logging_config" {
    for_each = var.logging_bucket_domain_name == null ? [] : [1]

    content {
      bucket          = var.logging_bucket_domain_name
      prefix          = "api/"
      include_cookies = false
    }
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-api" })
}

# --- WAF (ámbito CloudFront: solo existe en us-east-1) ----------------------

resource "aws_wafv2_web_acl" "this" {
  provider = aws.us_east_1

  name        = "${var.name_prefix}-cloudfront"
  description = "WAF de CloudFront de ${var.name_prefix}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = local.managed_rules

    content {
      name     = rule.value.name
      priority = rule.value.priority

      override_action {
        dynamic "none" {
          for_each = var.waf_block_mode ? [1] : []
          content {}
        }
        dynamic "count" {
          for_each = var.waf_block_mode ? [] : [1]
          content {}
        }
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.name
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.name_prefix}-${rule.key}"
        sampled_requests_enabled   = true
      }
    }
  }

  rule {
    name     = "RateLimitPerIp"
    priority = 50

    action {
      dynamic "block" {
        for_each = var.waf_block_mode ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_block_mode ? [] : [1]
        content {}
      }
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitAuthPerIp"
    priority = 60

    action {
      dynamic "block" {
        for_each = var.waf_block_mode ? [1] : []
        content {}
      }
      dynamic "count" {
        for_each = var.waf_block_mode ? [] : [1]
        content {}
      }
    }

    statement {
      rate_based_statement {
        limit              = var.waf_auth_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = var.waf_auth_path_prefix
            positional_constraint = "STARTS_WITH"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-rate-limit-auth"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-cloudfront"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

resource "aws_kms_key" "waf_logs" {
  provider = aws.us_east_1
  count    = var.waf_logging_enabled ? 1 : 0

  description             = "Cifrado de logs de WAF de ${var.name_prefix}"
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
        Principal = { Service = "logs.us-east-1.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:${local.partition}:logs:us-east-1:${local.account_id}:log-group:${local.waf_log_name}"
          }
        }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "waf_logs" {
  provider = aws.us_east_1
  count    = var.waf_logging_enabled ? 1 : 0

  name          = "alias/${var.name_prefix}-waf-logs"
  target_key_id = aws_kms_key.waf_logs[0].key_id
}

resource "aws_cloudwatch_log_group" "waf" {
  provider = aws.us_east_1
  count    = var.waf_logging_enabled ? 1 : 0

  name              = local.waf_log_name
  retention_in_days = var.waf_log_retention_days
  kms_key_id        = aws_kms_key.waf_logs[0].arn

  tags = var.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  provider = aws.us_east_1
  count    = var.waf_logging_enabled ? 1 : 0

  resource_arn            = aws_wafv2_web_acl.this.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}
