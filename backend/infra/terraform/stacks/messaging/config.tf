terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key y region llegan de environments/<ambiente>/messaging/backend.tfvars.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  # Ambiente local: todos los servicios van al endpoint de LocalStack.
  s3_use_path_style           = local.localstack
  skip_credentials_validation = local.localstack
  skip_metadata_api_check     = local.localstack

  dynamic "endpoints" {
    for_each = local.localstack ? [var.aws_endpoint_url] : []

    content {
      cloudwatch = endpoints.value
      iam        = endpoints.value
      kms        = endpoints.value
      s3         = endpoints.value
      s3control  = endpoints.value
      sns        = endpoints.value
      sqs        = endpoints.value
      sts        = endpoints.value
    }
  }

  default_tags {
    tags = merge(local.common_tags, { Stack = "messaging" })
  }
}
