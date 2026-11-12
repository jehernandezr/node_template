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

module "ses" {
  source = "../../modules/ses"

  name_prefix        = "nt-dev"
  domain             = "dev.example.com"
  route53_zone_id    = "Z0123456789ABCDEFGHIJ"
  dmarc_policy       = "none"
  dmarc_report_email = "dmarc@dev.example.com"

  tags = { Environment = "dev" }
}

output "configuration_set_names" {
  value = module.ses.configuration_set_names
}
