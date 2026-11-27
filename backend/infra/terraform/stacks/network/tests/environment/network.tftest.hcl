# Plans the network stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
# once per environment with -var-file common.tfvars and -var-file the stack's terraform.tfvars.

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
  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a", "us-east-1b", "us-east-1c"] }
  }
}

run "plans_with_the_environment_values" {
  command = plan
}
