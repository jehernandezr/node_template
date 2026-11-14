# Estado en el S3 de LocalStack. backend/infra/scripts/local.sh crea el bucket.
bucket                      = "node-template-local-tfstate"
key                         = "us-east-1/messaging/terraform.tfstate"
region                      = "us-east-1"
use_lockfile                = true
endpoints                   = { s3 = "http://localhost:4566" }
use_path_style              = true
skip_credentials_validation = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_metadata_api_check     = true
