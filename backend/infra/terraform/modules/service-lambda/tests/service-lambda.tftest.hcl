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
  name_prefix   = "nt-dev"
  function_name = "tasks-api"
  environment   = "dev"
  handler       = "lambda.handler"
  runtime       = "nodejs24.x"
  s3_bucket     = "nt-dev-artifacts"
  s3_key        = "lambda/tasks/abc.zip"
}

run "runs_in_production_mode" {
  command = plan

  assert {
    condition     = aws_lambda_function.this.environment[0].variables["NODE_ENV"] == "production"
    error_message = "The function must run with NODE_ENV=production, like the Fargate tasks."
  }
}
