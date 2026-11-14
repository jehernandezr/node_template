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

# CloudFront, su certificado y el WAF de ámbito CloudFront viven en us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "cloudfront_waf" {
  source = "../../modules/cloudfront-waf"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix         = "nt-dev"
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"

  web_aliases = ["app.dev.example.com"]

  api_origin_domain_name         = "api-origin.dev.example.com"
  api_aliases                    = ["api.dev.example.com"]
  api_origin_verify_header_value = "ejemplo-no-usar-en-produccion"

  waf_block_mode = false

  tags = { Environment = "dev" }
}

output "web_distribution_id" {
  value = module.cloudfront_waf.web_distribution_id
}
