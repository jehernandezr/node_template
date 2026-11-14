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

module "files_bucket" {
  source = "../../modules/files-bucket"

  name_prefix          = "nt-dev"
  cors_allowed_origins = ["https://app.dev.example.com", "http://localhost:3000"]
  force_destroy        = true

  tags = { Environment = "dev" }
}

output "bucket_id" {
  value = module.files_bucket.bucket_id
}
