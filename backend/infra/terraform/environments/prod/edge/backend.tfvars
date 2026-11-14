# Bucket con versionado y cifrado, creado una vez por ambiente (ver README).
bucket       = "node-template-prod-tfstate"
key          = "us-east-1/edge/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
