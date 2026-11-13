# Pruebas del stack platform con proveedores simulados: no tocan AWS ni el backend.
# Ejecuta: terraform init -backend=false && terraform test

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
    error_message = "Sin cómputo no se lee la red ni se crean ECS ni la API."
  }

  assert {
    condition     = length(module.files_bucket) == 1
    error_message = "El bucket de archivos existe también en local."
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
    error_message = "Las APIs en Fargate tienen ALB interno y VPC link."
  }

  assert {
    condition     = length(module.budget) == 1
    error_message = "monthly_budget crea el presupuesto."
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
