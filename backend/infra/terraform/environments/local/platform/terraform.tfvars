region           = "us-east-1"
environment      = "local"
name_prefix      = "node-template-local"
state_bucket     = "node-template-local-tfstate"
aws_endpoint_url = "http://localhost:4566"

# LocalStack emula archivos y correo; el cómputo (ECS, API Gateway HTTP, ALB) no se crea.
compute_enabled             = false
files_cors_allowed_origins  = ["http://localhost:8080"]
force_destroy_buckets       = true
secret_recovery_window_days = 0
