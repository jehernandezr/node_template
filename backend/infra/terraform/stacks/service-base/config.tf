terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # One state per service, apart from its runtime: environments/<environment>/services/<service>/base/backend.tfvars
  # sets the key <region>/services/<service>/base/terraform.tfstate.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(local.common_tags, { Stack = "service-base", Service = var.service_name })
  }
}

resource "terraform_data" "aws_only" {
  lifecycle {
    precondition {
      condition     = !local.localstack
      error_message = "Service stacks are deployed only on AWS. Locally the services run with nx serve against Docker and LocalStack."
    }
  }
}
