data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id

  # The account manages the key through IAM; AWS services only encrypt and decrypt
  # for resources in this account.
  statements = concat(
    [{
      Sid       = "EnableIamPolicies"
      Effect    = "Allow"
      Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${local.account_id}:root" }
      Action    = "kms:*"
      Resource  = "*"
    }],
    length(var.log_group_arns) == 0 ? [] : [{
      Sid       = "AllowCloudWatchLogs"
      Effect    = "Allow"
      Principal = { Service = "logs.${data.aws_region.current.region}.amazonaws.com" }
      Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
      Resource  = "*"
      Condition = { ArnLike = { "kms:EncryptionContext:aws:logs:arn" = var.log_group_arns } }
    }],
    [for p in var.service_principals : {
      Sid       = p.sid
      Effect    = "Allow"
      Principal = { Service = p.services }
      Action    = p.actions
      Resource  = "*"
      Condition = { StringEquals = { "aws:SourceAccount" = local.account_id } }
    }],
    [for p in var.account_principals : {
      Sid       = p.sid
      Effect    = "Allow"
      Principal = { AWS = p.arns }
      Action    = p.actions
      Resource  = "*"
      Condition = { StringEquals = { "kms:ViaService" = "${p.via_service}.${data.aws_region.current.region}.amazonaws.com" } }
    }],
  )
}

resource "aws_kms_key" "this" {
  description             = var.description
  enable_key_rotation     = true
  deletion_window_in_days = var.deletion_window_in_days

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = local.statements
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.alias}"
  target_key_id = aws_kms_key.this.key_id
}
