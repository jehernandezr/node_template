region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

github_repository = "jehernandezr/node_template"

# One ECR repository per directory under environments/staging/services.
services = ["billing", "identity", "notifications", "reports", "tasks"]
