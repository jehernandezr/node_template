terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4, < 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.7, < 4.0"
    }
  }

  # bucket, key and region come from environments/<environment>/data/backend.tfvars.
  backend "s3" {}
}

# No local environment: locally PostgreSQL and Valkey run in Docker (backend/docker-compose.yml).
provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "data" })
  }
}

resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "The data stack is deployed only on AWS. Locally PostgreSQL and Valkey run in Docker."
    }
  }
}
