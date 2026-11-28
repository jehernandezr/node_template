# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "prod"
name_prefix = "node-template-prod"

# Apex domain of the product. Its public hosted zone lives in this account and the global stack reads it.
domain = "example.com"

# Regions of the environment by code (ADR 0042): one in F12. Each region's API answers at api_base_url and its
# identity issues tokens with that issuer; prod drops the environment from the host (ADR 0045).
main_region = "us"
regions = {
  us = { aws_region = "us-east-1", api_base_url = "https://api.example.com", issuer = "https://api.example.com" }
}

# Origins of the web app (ADR 0045). Every service accepts browser requests only from these, as WEB_ORIGINS.
web_origins = ["https://app.example.com"]
