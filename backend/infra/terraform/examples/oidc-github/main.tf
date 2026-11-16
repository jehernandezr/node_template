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

module "oidc_github" {
  source = "../../modules/oidc-github"

  name_prefix        = "nt-dev"
  github_repository  = "mi-organizacion/node-template"
  github_environment = "dev"
  state_bucket       = "nt-dev-tfstate"

  tags = { Environment = "dev" }
}

output "deploy_role_arn" {
  value = module.oidc_github.deploy_role_arn
}
