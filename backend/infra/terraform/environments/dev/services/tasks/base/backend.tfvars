# Versioned, encrypted bucket, created once per environment (see README).
bucket       = "node-template-dev-tfstate"
key          = "us-east-1/services/tasks/base/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
