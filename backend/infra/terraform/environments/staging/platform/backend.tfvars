# Bucket con versionado y cifrado, creado una vez por ambiente (ver README).
bucket       = "node-template-staging-tfstate"
key          = "us-east-1/platform/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
