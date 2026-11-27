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

# Role, log group and security group of the function: they exist before the function that uses them.
module "billing_worker_base" {
  source = "../../modules/component-base"

  name_prefix = "nt-dev"
  name        = "billing-worker"
  runtime     = "lambda"
  vpc_id      = "vpc-0123456789abcdef0"

  tags = { Environment = "dev" }
}

module "billing_worker" {
  source = "../../modules/service-lambda"

  name_prefix   = "nt-dev"
  function_name = "billing-worker"
  environment   = "dev"
  handler       = "lambda.sqsHandler"

  role_arn       = module.billing_worker_base.role_arn
  role_name      = module.billing_worker_base.role_name
  log_group_name = module.billing_worker_base.log_group_name
  kms_key_arn    = module.billing_worker_base.kms_key_arn

  s3_bucket = "nt-dev-artifacts-123456789012"
  s3_key    = "billing/worker-0.1.0.zip"

  queue_arn         = "arn:aws:sqs:us-east-1:123456789012:nt-dev-billing"
  queue_kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/00000000-0000-0000-0000-000000000000"

  memory_size                    = 512
  timeout                        = 30
  reserved_concurrent_executions = 10
  maximum_concurrency            = 5

  # ADOT layer for arm64 in the region; confirm the current ARN and version.
  otel_layer_arn            = "arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-arm64-ver-0-102-1:1"
  otel_collector_config_uri = "/var/task/collector.yaml"

  vpc_enabled       = true
  security_group_id = module.billing_worker_base.security_group_id
  subnet_ids        = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]

  tags = { Environment = "dev" }
}

output "function_arn" {
  value = module.billing_worker.function_arn
}
