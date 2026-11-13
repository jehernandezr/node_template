terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # Un estado por servicio: environments/<ambiente>/services/<servicio>/backend.tfvars
  # fija la clave <región>/services/<servicio>/terraform.tfstate.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "service", Service = var.service_name })
  }
}

resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "Los stacks de servicio solo se despliegan en AWS. En local los servicios corren con nx serve contra Docker y LocalStack."
    }
  }
}
