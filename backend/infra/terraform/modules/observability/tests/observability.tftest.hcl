# Tests for the observability module with mocked AWS: they touch neither AWS nor a backend.
# Run: terraform init -backend=false && terraform test

mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }
  mock_data "aws_region" {
    defaults = { region = "us-east-1", name = "us-east-1" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
}

variables {
  name_prefix                      = "nt-test"
  vpc_id                           = "vpc-0123456789abcdef0"
  vpc_cidr                         = "10.0.0.0/16"
  subnet_ids                       = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
  cluster_arn                      = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-test"
  root_user_email                  = "observability@example.test"
  create_internal_alb              = true
  internal_alb_deletion_protection = false
}

run "keeps_the_root_password_out_of_the_state" {
  command = plan

  assert {
    condition     = aws_secretsmanager_secret_version.root.secret_string == null && aws_secretsmanager_secret_version.root.secret_string_wo == null
    error_message = "The root password and the OTLP header reach Secrets Manager through a write-only attribute, never through the state (ADR 0041)."
  }

  assert {
    condition     = aws_secretsmanager_secret_version.root.secret_string_wo_version == 1
    error_message = "The root secret is written once, at creation."
  }
}
