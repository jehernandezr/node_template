# Plans the messaging stack with the real values of an environment, the real topology.json and mocked providers.
# tf-validate.mjs runs it once per environment with -var-file common.tfvars and -var-file the stack's
# terraform.tfvars.

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_region" {
    defaults = { region = "us-east-1", name = "us-east-1" }
  }
}

override_data {
  target = data.terraform_remote_state.platform
  values = {
    outputs = {
      alarm_topic_arn = "arn:aws:sns:us-east-1:123456789012:alarms"
      ses             = null
    }
  }
}

run "plans_with_the_environment_values" {
  command = plan
}
