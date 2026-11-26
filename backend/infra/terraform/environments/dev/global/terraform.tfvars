region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

# Apex domain: the stack creates dev.<domain> and prints its name servers for the delegation.
domain = "example.com"

github_repository = "jehernandezr/node_template"

# One ECR repository per directory under environments/dev/services.
services = ["billing", "identity", "notifications", "reports", "tasks"]

# Accounts that promote from dev. Add each one after its global stack exists (first-deploy.md).
# promotion_account_ids = { staging = "222222222222", prod = "333333333333" }
promotion_account_ids = {}

# dev is disposable: allows deleting the artifacts bucket and the repositories with content.
force_destroy_artifacts = true
