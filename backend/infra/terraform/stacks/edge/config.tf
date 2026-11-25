terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key and region come from environments/<environment>/edge/backend.tfvars.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "edge" })
  }
}

# CloudFront, its WAF and its ACM certificate only exist in us-east-1.
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
      error_message = "The edge stack is deployed only on AWS: LocalStack does not emulate CloudFront or WAF in its free plan."
    }
  }
}
