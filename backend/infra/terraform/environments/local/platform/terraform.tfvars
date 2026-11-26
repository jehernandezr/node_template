region           = "us-east-1"
state_bucket     = "node-template-local-tfstate"
aws_endpoint_url = "http://localhost:4566"

# LocalStack emulates files and email; compute (ECS, HTTP API Gateway, ALB) is not created.
compute_enabled             = false
files_cors_allowed_origins  = ["http://localhost:8080"]
force_destroy_buckets       = true
secret_recovery_window_days = 0
