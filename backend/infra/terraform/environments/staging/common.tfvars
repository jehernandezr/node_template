# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "staging"
name_prefix = "node-template-staging"

# Apex domain of the product. The global stack creates staging.<domain> and prints its name servers for the
# delegation from the apex zone in the prod account.
domain = "example.com"

# Regions of the environment by code (ADR 0042): one in F12. Each region's API answers at api_base_url and its
# identity issues tokens with that issuer; prod drops the environment from the host (ADR 0045).
main_region = "us"
regions = {
  us = { aws_region = "us-east-1", api_base_url = "https://api.staging.example.com", issuer = "https://api.staging.example.com" }
}

# Origins of the web app (ADR 0045). Every service accepts browser requests only from these, as WEB_ORIGINS.
web_origins = ["https://app.staging.example.com"]
