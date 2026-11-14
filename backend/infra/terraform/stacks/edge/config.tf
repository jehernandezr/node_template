terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key y region llegan de environments/<ambiente>/edge/backend.tfvars.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "edge" })
  }
}

# CloudFront, su WAF y su certificado ACM solo existen en us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = merge(local.common_tags, { Stack = "edge" })
  }
}

resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "El stack edge solo se despliega en AWS: LocalStack no emula CloudFront ni WAF en su plan gratuito."
    }
  }
}
