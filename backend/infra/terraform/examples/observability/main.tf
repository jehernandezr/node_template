terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6, < 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "observability" {
  source = "../../modules/observability"

  name_prefix  = "nt-dev"
  vpc_id       = "vpc-0123456789abcdef0"
  vpc_cidr     = "10.0.0.0/16"
  subnet_ids   = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  cluster_arn  = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev"
  cluster_name = "nt-dev"

  root_user_email = "observability@dev.example.com"

  # ALB interno propio. Para compartir el ALB público usa create_internal_alb = false
  # con alb_listener_arn, alb_security_group_id y host_headers.
  create_internal_alb              = true
  internal_alb_certificate_arn     = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
  internal_alb_deletion_protection = false
  storage_force_destroy            = true

  tags = { Environment = "dev" }
}

output "otlp_http_endpoint" {
  value = module.observability.otlp_http_endpoint
}
