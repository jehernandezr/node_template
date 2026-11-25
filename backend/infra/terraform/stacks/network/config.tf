terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key and region come from environments/<environment>/network/backend.tfvars.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "network" })
  }
}

# The local environment has no network of its own: services run in Docker or on the host.
resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "The network stack is deployed only on AWS. Locally use the platform and messaging stacks."
    }
  }
}
