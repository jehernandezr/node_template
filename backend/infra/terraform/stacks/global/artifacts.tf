# Lambda packages under lambda/<service>/<commit>.zip and mobile builds. In dev, the deploy roles of the
# promotion accounts read the Lambda packages through the bucket policy and the key policy.

locals {
  artifacts_bucket     = "${var.name_prefix}-artifacts"
  artifacts_bucket_arn = "arn:${local.partition}:s3:::${local.artifacts_bucket}"

  artifacts_statements = concat(
    [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [local.artifacts_bucket_arn, "${local.artifacts_bucket_arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }],
    local.promotes ? [{
      Sid       = "AllowPromotionRead"
      Effect    = "Allow"
      Principal = { AWS = local.promotion_role_arns }
      Action    = ["s3:GetObject", "s3:GetObjectVersion"]
      Resource  = ["${local.artifacts_bucket_arn}/lambda/*"]
    }] : [],
  )
}

module "artifacts_kms" {
  source = "../../modules/kms-key"

  alias       = "${var.name_prefix}-artifacts"
  description = "Encryption of the deploy artifacts bucket of ${var.name_prefix}"
  account_principals = local.promotes ? [{
    sid         = "AllowPromotionRead"
    arns        = local.promotion_role_arns
    via_service = "s3"
  }] : []
}

resource "aws_s3_bucket" "artifacts" {
  bucket        = local.artifacts_bucket
  force_destroy = var.force_destroy_artifacts
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = module.artifacts_kms.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = jsonencode({ Version = "2012-10-17", Statement = local.artifacts_statements })

  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}
