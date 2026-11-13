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

  # bucket, key y region llegan de environments/<ambiente>/data/backend.tfvars.
  backend "s3" {}
}

# Sin ambiente local: en local PostgreSQL y Valkey corren en Docker (backend/docker-compose.yml).
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
      error_message = "El stack data solo se despliega en AWS. En local PostgreSQL y Valkey corren en Docker."
    }
  }
}
