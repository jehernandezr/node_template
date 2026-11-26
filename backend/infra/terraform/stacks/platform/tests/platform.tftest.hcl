# Tests for the platform stack with mocked providers: they touch neither AWS nor the backend.
# Run: terraform init -backend=false && terraform test

mock_provider "aws" {
  mock_data "aws_region" {
    defaults = { region = "us-east-1", name = "us-east-1" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }
}

variables {
  region       = "us-east-1"
  domain       = "example.test"
  name_prefix  = "nt-test"
  state_bucket = "nt-test-tfstate"
}

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id             = "vpc-0123456789abcdef0"
      vpc_cidr           = "10.10.0.0/16"
      public_subnet_ids  = ["subnet-0a", "subnet-0b"]
      private_subnet_ids = ["subnet-0c", "subnet-0d"]
    }
  }
}

run "local_without_compute" {
  command = plan

  variables {
    environment                = "local"
    aws_endpoint_url           = "http://localhost:4566"
    compute_enabled            = false
    files_cors_allowed_origins = ["http://localhost:8080"]
  }

  assert {
    condition     = length(data.terraform_remote_state.network) == 0 && length(module.http_api) == 0 && length(module.ecs_cluster) == 0
    error_message = "Without compute the network is not read and neither ECS nor the API is created."
  }

  assert {
    condition     = length(module.compute_logs_kms) == 0 && output.compute_logs_kms_key_arn == null
    error_message = "Without compute there is no CMK for the service logs."
  }

  assert {
    condition     = length(module.files_bucket) == 1
    error_message = "The files bucket also exists locally, without compute."
  }
}

run "dev_with_fargate_api" {
  command = plan

  variables {
    environment         = "dev"
    fargate_api_enabled = true
    alarm_email         = "alarmas@empresa.test"
    monthly_budget      = 200
  }

  assert {
    condition     = length(module.api_alb) == 1 && length(aws_vpc_security_group_egress_rule.vpc_link_to_api_alb) == 1
    error_message = "Fargate APIs have an internal ALB and a VPC link."
  }

  assert {
    condition     = length(module.budget) == 1
    error_message = "monthly_budget creates the budget."
  }

  assert {
    condition     = length(module.compute_logs_kms) == 1
    error_message = "With compute there is one logs CMK per environment for all services."
  }
}

run "prod_rejects_example_alarm_email" {
  command = plan

  variables {
    environment = "prod"
    alarm_email = "REEMPLAZAR@example.com"
  }

  expect_failures = [var.alarm_email]
}

run "staging_requires_alarm_destination" {
  command = plan

  variables {
    environment = "staging"
  }

  expect_failures = [terraform_data.alarm_check]
}
