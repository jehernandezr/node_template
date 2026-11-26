region       = "us-east-1"
environment  = "prod"
name_prefix  = "node-template-prod"
state_bucket = "node-template-prod-tfstate"

# Apex domain: its public hosted zone exists in this account before the first apply.
domain = "example.com"

github_repository = "jehernandezr/node_template"

# One ECR repository per directory under environments/prod/services.
services = ["billing", "identity", "notifications", "reports", "tasks"]
