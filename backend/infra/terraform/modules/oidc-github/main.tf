# GitHub Actions access to AWS without long-lived keys: the job presents its OIDC token and assumes
# a role. Each role trusts only one GitHub repository and environment, with no wildcards. The ECR
# repositories and the artifacts bucket belong to the caller, which passes their ARNs.
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

  web_bucket = "${var.name_prefix}-web-${local.account_id}"
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

# --- Deploy role: terraform plan and apply of the stacks -------------------------------

resource "aws_iam_role" "deploy" {
  name                 = "${var.name_prefix}-github-deploy"
  description          = "Terraform deploy from GitHub Actions (${var.github_environment})"
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
    sid       = "StateKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = ["arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "kms:EncryptionContext:aws:s3:arn"
      values   = ["arn:${local.partition}:s3:::${var.state_bucket}", "arn:${local.partition}:s3:::${var.state_bucket}/*"]
    }
  }

  statement {
    sid       = "ArtifactsRead"
    actions   = ["s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${var.artifacts_bucket_arn}/*"]
  }

  statement {
    sid       = "ArtifactsKey"
    actions   = ["kms:Decrypt"]
    resources = [var.artifacts_kms_key_arn]
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

# --- Publish role: images, Lambda bundles and mobile builds ----------------------------

resource "aws_iam_role" "publish" {
  name                 = "${var.name_prefix}-github-publish"
  description          = "Image and artifact publishing from GitHub Actions (${var.github_environment})"
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
    resources = var.ecr_repository_arns
  }

  statement {
    sid       = "ArtifactsList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.artifacts_bucket_arn]
  }

  statement {
    sid       = "ArtifactsWrite"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${var.artifacts_bucket_arn}/*"]
  }

  statement {
    sid       = "ArtifactsKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [var.artifacts_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "publish" {
  name   = "images-and-artifacts"
  role   = aws_iam_role.publish.id
  policy = data.aws_iam_policy_document.publish.json
}

# --- Web role: syncs the Flutter build and invalidates CloudFront ----------------------

resource "aws_iam_role" "web" {
  name                 = "${var.name_prefix}-github-web"
  description          = "Web publishing from GitHub Actions (${var.github_environment})"
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

  # The web bucket is encrypted with its CMK, which lives in the edge stack: access is allowed by
  # the S3 service and by the bucket encryption context, without knowing the key ARN.
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
