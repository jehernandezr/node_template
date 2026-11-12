terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }

  # bucket, key y region llegan con -backend-config. Un estado por región y entorno.
  backend "s3" {
    encrypt      = true
    use_lockfile = true
  }
}
