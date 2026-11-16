# Acceso de GitHub Actions a AWS sin claves de larga vida: el job presenta su token OIDC y asume
# un rol. Cada rol confía solo en un repositorio y un environment de GitHub, sin comodines.
data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  region     = data.aws_region.current.region

  provider_host = "token.actions.githubusercontent.com"
  provider_arn  = var.create_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_provider_arn
  subject       = "repo:${var.github_repository}:environment:${var.github_environment}"

  artifacts_bucket = "${var.name_prefix}-artifacts-${local.account_id}"
  web_bucket       = "${var.name_prefix}-web-${local.account_id}"
  ecr_repositories = "arn:${local.partition}:ecr:${local.region}:${local.account_id}:repository/${var.name_prefix}/*"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_provider ? 1 : 0

  url            = "https://${local.provider_host}"
  client_id_list = ["sts.amazonaws.com"]

  tags = var.tags
}

data "aws_iam_policy_document" "trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.provider_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.provider_host}:sub"
      values   = [local.subject]
    }
  }
}

# --- Artefactos: bundles de las Lambdas y compilados de la app móvil --------------------

resource "aws_s3_bucket" "artifacts" {
  bucket        = local.artifacts_bucket
  force_destroy = var.artifacts_force_destroy

  tags = merge(var.tags, { Name = local.artifacts_bucket })
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

module "artifacts_kms" {
  source = "../kms-key"

  alias       = "${var.name_prefix}-artifacts"
  description = "Cifrado del bucket de artefactos del despliegue de ${var.name_prefix}"
  tags        = var.tags
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

data "aws_iam_policy_document" "artifacts_tls" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.artifacts.arn,
      "${aws_s3_bucket.artifacts.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = data.aws_iam_policy_document.artifacts_tls.json

  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}

# --- Rol de despliegue: terraform plan y apply de los stacks ---------------------------

resource "aws_iam_role" "deploy" {
  name                 = "${var.name_prefix}-github-deploy"
  description          = "Despliegue con Terraform desde GitHub Actions (${var.github_environment})"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600

  tags = var.tags
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "StateBucketList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = ["arn:${local.partition}:s3:::${var.state_bucket}"]
  }

  statement {
    sid       = "StateObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${var.state_bucket}/*"]
  }

  statement {
    sid       = "ArtifactsRead"
    actions   = ["s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }

  statement {
    sid       = "ArtifactsKey"
    actions   = ["kms:Decrypt"]
    resources = [module.artifacts_kms.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "state-and-artifacts"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

resource "aws_iam_role_policy_attachment" "deploy" {
  for_each = toset(var.deploy_policy_arns)

  role       = aws_iam_role.deploy.name
  policy_arn = each.value
}

# --- Rol de publicación: imágenes, bundles de Lambda y compilados móviles --------------

resource "aws_iam_role" "publish" {
  name                 = "${var.name_prefix}-github-publish"
  description          = "Publicación de imágenes y artefactos desde GitHub Actions (${var.github_environment})"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600

  tags = var.tags
}

data "aws_iam_policy_document" "publish" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:CreateRepository",
      "ecr:DescribeRepositories",
      "ecr:DescribeImages",
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [local.ecr_repositories]
  }

  statement {
    sid       = "ArtifactsList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.artifacts.arn]
  }

  statement {
    sid       = "ArtifactsWrite"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }

  statement {
    sid       = "ArtifactsKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [module.artifacts_kms.arn]
  }
}

resource "aws_iam_role_policy" "publish" {
  name   = "images-and-artifacts"
  role   = aws_iam_role.publish.id
  policy = data.aws_iam_policy_document.publish.json
}

# --- Rol de la web: sincroniza el build de Flutter y invalida CloudFront ---------------

resource "aws_iam_role" "web" {
  name                 = "${var.name_prefix}-github-web"
  description          = "Publicación de la web desde GitHub Actions (${var.github_environment})"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600

  tags = var.tags
}

data "aws_iam_policy_document" "web" {
  statement {
    sid       = "WebBucketList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = ["arn:${local.partition}:s3:::${local.web_bucket}"]
  }

  statement {
    sid       = "WebObjects"
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
    resources = ["arn:${local.partition}:s3:::${local.web_bucket}/*"]
  }

  # El bucket web va cifrado con su CMK, que vive en el stack edge: se permite por el servicio S3
  # y por el contexto de cifrado del bucket, sin conocer el ARN de la clave.
  statement {
    sid       = "WebBucketKey"
    actions   = ["kms:GenerateDataKey", "kms:Decrypt", "kms:DescribeKey"]
    resources = ["arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "kms:EncryptionContext:aws:s3:arn"
      values   = ["arn:${local.partition}:s3:::${local.web_bucket}", "arn:${local.partition}:s3:::${local.web_bucket}/*"]
    }
  }

  statement {
    sid       = "FindDistribution"
    actions   = ["cloudfront:ListDistributions"]
    resources = ["*"]
  }

  statement {
    sid       = "Invalidate"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:${local.partition}:cloudfront::${local.account_id}:distribution/*"]
  }
}

resource "aws_iam_role_policy" "web" {
  name   = "web-bucket-and-invalidation"
  role   = aws_iam_role.web.id
  policy = data.aws_iam_policy_document.web.json
}
