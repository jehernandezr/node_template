terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Servicio con tráfico entrante detrás del ALB.
module "realtime" {
  source = "../../modules/service-fargate"

  name_prefix  = "nt-dev"
  service_name = "realtime"
  environment  = "dev"

  cluster_arn  = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev"
  cluster_name = "nt-dev"
  vpc_id       = "vpc-0123456789abcdef0"
  subnet_ids   = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]

  image          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/realtime:0.1.0"
  container_port = 3000
  cpu            = 512
  memory         = 1024

  environment_variables = { LOG_LEVEL = "info" }
  secrets = {
    DATABASE_URL = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev-realtime-AbCdEf:DATABASE_URL::"
  }

  otlp_endpoint             = "https://observability.dev.example.com/api/default"
  otlp_authorization_secret = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev-openobserve-AbCdEf:OTLP_AUTHORIZATION::"

  enable_load_balancer   = true
  alb_listener_arn       = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-dev-alb/0123456789abcdef/0123456789abcdef"
  alb_security_group_id  = "sg-0123456789abcdef0"
  listener_rule_priority = 100
  host_headers           = ["realtime.dev.example.com"]

  min_capacity = 2
  max_capacity = 6

  tags = { Environment = "dev" }
}

# Worker sin tráfico entrante que escala por la cola, con mínimo cero.
module "reports_worker" {
  source = "../../modules/service-fargate"

  name_prefix  = "nt-dev"
  service_name = "reports-worker"
  environment  = "dev"

  cluster_arn  = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev"
  cluster_name = "nt-dev"
  vpc_id       = "vpc-0123456789abcdef0"
  subnet_ids   = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]

  image   = "123456789012.dkr.ecr.us-east-1.amazonaws.com/reports:0.1.0"
  command = ["node", "worker.js"]

  capacity_provider_strategy = [{ capacity_provider = "FARGATE_SPOT", weight = 1 }]

  desired_count      = 0
  min_capacity       = 0
  max_capacity       = 5
  cpu_target_percent = null

  sqs_scaling = {
    queue_name        = "nt-dev-reports"
    messages_per_task = 50
  }

  task_policies = {
    sqs = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
        Resource = "arn:aws:sqs:us-east-1:123456789012:nt-dev-reports"
      }]
    })
  }
}

output "realtime_security_group_id" {
  value = module.realtime.security_group_id
}
