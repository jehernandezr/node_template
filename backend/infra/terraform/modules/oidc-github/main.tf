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

locals {
  trust_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = local.provider_arn }
      Condition = {
        StringEquals = {
          "${local.provider_host}:aud" = "sts.amazonaws.com"
          "${local.provider_host}:sub" = local.subject
        }
      }
    }]
  })
}

# --- Deploy role: terraform plan and apply of the stacks -------------------------------

resource "aws_iam_role" "deploy" {
  name                 = "${var.name_prefix}-github-deploy"
  description          = "Terraform deploy from GitHub Actions (${var.github_environment})"
  assume_role_policy   = local.trust_policy
  max_session_duration = 3600

  tags = var.tags
}

locals {
  state_bucket_arn = "arn:${local.partition}:s3:::${var.state_bucket}"

  deploy_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StateBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = local.state_bucket_arn
      },
      {
        Sid      = "StateObjects"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${local.state_bucket_arn}/*"
      },
      {
        Sid      = "StateKey"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = "arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"
        Condition = {
          StringEquals = { "kms:ViaService" = "s3.${local.region}.amazonaws.com" }
          StringLike   = { "kms:EncryptionContext:aws:s3:arn" = [local.state_bucket_arn, "${local.state_bucket_arn}/*"] }
        }
      },
      {
        Sid      = "ArtifactsRead"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion"]
        Resource = "${var.artifacts_bucket_arn}/*"
      },
      {
        Sid      = "ArtifactsKey"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = var.artifacts_kms_key_arn
      },
    ]
  })
}

resource "aws_iam_role_policy" "deploy" {
  name   = "state-and-artifacts"
  role   = aws_iam_role.deploy.id
  policy = local.deploy_policy
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
  assume_role_policy   = local.trust_policy
  max_session_duration = 3600

  tags = var.tags
}

locals {
  publish_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrLogin"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
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
        Resource = var.ecr_repository_arns
      },
      {
        Sid      = "ArtifactsList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = var.artifacts_bucket_arn
      },
      {
        Sid      = "ArtifactsWrite"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"]
        Resource = "${var.artifacts_bucket_arn}/*"
      },
      {
        Sid      = "ArtifactsKey"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = var.artifacts_kms_key_arn
      },
    ]
  })
}

resource "aws_iam_role_policy" "publish" {
  name   = "images-and-artifacts"
  role   = aws_iam_role.publish.id
  policy = local.publish_policy
}

# --- Web role: syncs the Flutter build and invalidates CloudFront ----------------------

resource "aws_iam_role" "web" {
  name                 = "${var.name_prefix}-github-web"
  description          = "Web publishing from GitHub Actions (${var.github_environment})"
  assume_role_policy   = local.trust_policy
  max_session_duration = 3600

  tags = var.tags
}

# The web bucket is encrypted with its CMK, which lives in the edge stack: access is allowed by
# the S3 service and by the bucket encryption context, without knowing the key ARN.
locals {
  web_bucket_arn = "arn:${local.partition}:s3:::${local.web_bucket}"

  web_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "WebBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = local.web_bucket_arn
      },
      {
        Sid      = "WebObjects"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
        Resource = "${local.web_bucket_arn}/*"
      },
      {
        Sid      = "WebBucketKey"
        Effect   = "Allow"
        Action   = ["kms:GenerateDataKey", "kms:Decrypt", "kms:DescribeKey"]
        Resource = "arn:${local.partition}:kms:${local.region}:${local.account_id}:key/*"
        Condition = {
          StringEquals = { "kms:ViaService" = "s3.${local.region}.amazonaws.com" }
          StringLike   = { "kms:EncryptionContext:aws:s3:arn" = [local.web_bucket_arn, "${local.web_bucket_arn}/*"] }
        }
      },
      {
        Sid      = "FindDistribution"
        Effect   = "Allow"
        Action   = ["cloudfront:ListDistributions"]
        Resource = "*"
      },
      {
        Sid      = "Invalidate"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
        Resource = "arn:${local.partition}:cloudfront::${local.account_id}:distribution/*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "web" {
  name   = "web-bucket-and-invalidation"
  role   = aws_iam_role.web.id
  policy = local.web_policy
}
