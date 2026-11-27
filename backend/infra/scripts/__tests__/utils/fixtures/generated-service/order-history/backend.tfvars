# Bucket with versioning and encryption, created once per environment (see README).
bucket       = "node-template-dev-tfstate"
key          = "us-east-1/services/order_history/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
