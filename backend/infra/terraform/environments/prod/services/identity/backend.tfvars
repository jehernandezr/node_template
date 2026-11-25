# Versioned, encrypted bucket, created once per environment (see README).
bucket       = "node-template-prod-tfstate"
key          = "us-east-1/services/identity/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
