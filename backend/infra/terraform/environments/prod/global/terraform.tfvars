region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

github_repository = "jehernandezr/node_template"

# One ECR repository per directory under environments/prod/services.
services = ["billing", "identity", "notifications", "reports", "tasks"]
