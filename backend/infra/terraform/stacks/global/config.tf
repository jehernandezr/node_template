terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket and region come from environments/<environment>/global/backend.tfvars; the key is global/terraform.tfstate.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  s3_use_path_style           = local.localstack
  skip_credentials_validation = local.localstack
  skip_metadata_api_check     = local.localstack

  default_tags {
    tags = merge(local.common_tags, { Stack = "global" })
  }
}
