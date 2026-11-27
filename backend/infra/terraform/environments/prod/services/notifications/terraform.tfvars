region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

service_name = "notifications"

# API on Fargate behind the internal ALB. It also handles the transactional email operation, so it sends
# through SES.
api = {
  route_prefixes    = ["/v1/notifications", "/v1/notification-preferences"]
  desired_count     = 2
  min_capacity      = 2
  max_capacity      = 6
  spot              = false
  health_check_path = "/health/ready"
}

# SSE and Socket.IO behind the public ALB, in the same process as the API (REALTIME_HOST = "service").
realtime = {
  path_patterns = ["/v1/notifications/stream", "/socket.io/*"]
  desired_count = 2
  min_capacity  = 2
  max_capacity  = 6
}

# Sizes of the workers that service-base defines, under the same keys.
workers = {
  triggers         = { max_capacity = 2 }
  realtime-control = { max_capacity = 2 }
}
