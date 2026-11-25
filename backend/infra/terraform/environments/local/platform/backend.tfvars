# State in the LocalStack S3. backend/infra/scripts/local.sh creates the bucket.
bucket                      = "node-template-local-tfstate"
key                         = "us-east-1/platform/terraform.tfstate"
region                      = "us-east-1"
use_lockfile                = true
endpoints                   = { s3 = "http://localhost:4566" }
use_path_style              = true
skip_credentials_validation = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_metadata_api_check     = true
