# Plans the platform stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
# once per environment with -var-file common.tfvars and -var-file the stack's terraform.tfvars. The alarm mailbox
# is not committed: the deploy passes it as TF_VAR_alarm_email, and this test does the same.

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

run "plans_with_the_environment_values" {
  command = plan

  variables {
    alarm_email = "alarms@deploy.test"
  }

  assert {
    condition     = length(module.api_alb) == (var.compute_enabled ? 1 : 0)
    error_message = "Every environment with compute has the internal ALB of the Fargate APIs."
  }
}
