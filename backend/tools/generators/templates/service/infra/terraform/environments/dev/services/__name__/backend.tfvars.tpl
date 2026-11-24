# Bucket con versionado y cifrado, creado una vez por ambiente (ver README).
bucket       = "node-template-dev-tfstate"
key          = "us-east-1/services/__name__/terraform.tfstate"
region       = "us-east-1"
use_lockfile = true
encrypt      = true
