terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "alb" {
  source = "../../modules/alb"

  name_prefix     = "nt-dev"
  vpc_id          = "vpc-0123456789abcdef0"
  subnet_ids      = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"

  idle_timeout_seconds = 3600
  deletion_protection  = false

  tags = { Environment = "dev" }
}

output "https_listener_arn" {
  value = module.alb.https_listener_arn
}
