region       = "us-east-1"
environment  = "staging"
name_prefix  = "node-template-staging"
state_bucket = "node-template-staging-tfstate"

# Apex domain: the stack creates staging.<domain> and prints its name servers for the delegation.
domain = "example.com"

github_repository = "jehernandezr/node_template"

# One ECR repository per directory under environments/staging/services.
services = ["billing", "identity", "notifications", "reports", "tasks"]
