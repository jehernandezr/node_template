# Tests for the service-lambda module with mocked providers: they touch neither AWS nor a backend.
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
  name_prefix    = "nt-dev"
  function_name  = "tasks-api"
  environment    = "dev"
  handler        = "lambda.handler"
  runtime        = "nodejs24.x"
  s3_bucket      = "nt-dev-artifacts"
  s3_key         = "lambda/tasks/abc.zip"
  role_arn       = "arn:aws:iam::123456789012:role/nt-dev-tasks-api"
  role_name      = "nt-dev-tasks-api"
  log_group_name = "/aws/lambda/nt-dev-tasks-api"
  kms_key_arn    = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
}

run "runs_in_production_mode" {
  command = plan

  assert {
    condition     = aws_lambda_function.this.environment[0].variables["NODE_ENV"] == "production"
    error_message = "The function must run with NODE_ENV=production, like the Fargate tasks."
  }
}

run "runs_with_the_role_and_log_group_it_is_given" {
  command = plan

  assert {
    condition     = aws_lambda_function.this.role == var.role_arn && aws_lambda_function.this.logging_config[0].log_group == var.log_group_name
    error_message = "The function uses the role and the log group of component-base instead of creating its own."
  }

  assert {
    condition     = aws_iam_role_policy.runtime.role == var.role_name
    error_message = "The async DLQ permission is attached to the component-base role."
  }
}

run "the_vpc_needs_the_component_security_group" {
  command = plan

  variables {
    vpc_enabled = true
    subnet_ids  = ["subnet-0123456789abcdef0"]
  }

  expect_failures = [terraform_data.input_check]
}
