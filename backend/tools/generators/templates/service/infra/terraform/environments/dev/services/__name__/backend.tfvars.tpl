# Bucket with versioning and encryption, created once per environment (see README).
bucket       = "node-template-dev-tfstate"
key          = "us-east-1/services/__service_name__/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
