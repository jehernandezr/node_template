# Plans one service stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
# once per service of each environment with -var-file common.tfvars and -var-file the service's terraform.tfvars,
# and puts before it the override_data blocks that EnvironmentMocks (backend/infra/scripts/environment-mocks.mjs)
# builds for that environment: the platform outputs follow its platform tfvars (no realtime ALB without a
# certificate, no SES without ses_domain), the messaging outputs topology.json and the service-base outputs the
# service's base/terraform.tfvars. A failure here is a contradiction between the service values and the other
# stacks of the same environment. The image and the Lambda package arrive as the pipeline passes them.

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

run "plans_with_the_environment_values" {
  command = plan

  variables {
    image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/service@sha256:0000000000000000000000000000000000000000000000000000000000000000"
    lambda_package = {
      s3_bucket = "nt-env-artifacts"
      s3_key    = "lambda/service/0000000.zip"
    }
  }

  assert {
    condition     = local.listener_priority != null && length(distinct(values(local.listener_priorities))) == length(local.listener_priorities)
    error_message = "The service has its entry in listener-priorities.json and no two services share a listener priority."
  }

  assert {
    condition     = alltrue([for component in concat(module.api_fargate, module.realtime) : can(regex("^[a-z0-9][a-z0-9-]{0,4}-$", component.target_group_name_prefix))])
    error_message = "Every target group takes a valid prefix of at most 6 characters, whatever the length of name_prefix (B18)."
  }

  assert {
    condition     = output.api_runtime == local.service_base.components["api"].runtime
    error_message = "The API runs on the runtime its service-base gave it a role for."
  }

  assert {
    condition     = length(module.worker) > 0 && alltrue([for worker in module.worker : worker.min_capacity >= 1])
    error_message = "Every service has a worker with at least one task for the outbox relay, the jobs and saga recovery (ADR 0039)."
  }

  assert {
    condition     = var.service_name != "tasks" || (var.environment == "dev") == (length(module.api_lambda) == 1)
    error_message = "tasks runs its API on Lambda in dev and on Fargate elsewhere, so both runtimes stay in acceptance (ADR 0039)."
  }
}
