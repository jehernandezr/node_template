terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key y region llegan de environments/<ambiente>/network/backend.tfvars.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "network" })
  }
}

# El ambiente local no tiene red propia: los servicios corren en Docker o en la máquina.
resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "El stack network solo se despliega en AWS. En local usa los stacks platform y messaging."
    }
  }
}
