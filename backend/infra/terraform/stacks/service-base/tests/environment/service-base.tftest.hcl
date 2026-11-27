# Plans one service-base stack with the real values of an environment and mocked providers. tf-validate.mjs runs
# it once per service of each environment with -var-file common.tfvars and -var-file the service's
# base/terraform.tfvars, and puts before it the override_data blocks that EnvironmentMocks
# (backend/infra/scripts/environment-mocks.mjs) builds for that environment: the platform outputs follow its
# platform tfvars, the data outputs its data tfvars and the messaging outputs topology.json. A failure here is a
# contradiction between the service values and the other stacks of the same environment.

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

  assert {
    condition     = alltrue([for key in ["DB_PROXY_HOST", "DB_READER_HOSTS", "DB_PORT", "DB_DATABASES"] : contains(keys(output.one_off_task.environment), key)]) && output.one_off_task.environment == output.fargate_environment
    error_message = "The one-off task reaches the service databases with the environment every Fargate task of the service gets (ADR 0043)."
  }

  assert {
    condition     = length([for key in keys(local.components) : key if startswith(key, "worker-")]) > 0
    error_message = "Every service has a worker for the outbox relay, the jobs and saga recovery (ADR 0039)."
  }

  assert {
    condition     = var.service_name != "tasks" || (var.environment == "dev") == (var.api.runtime == "lambda")
    error_message = "tasks runs its API on Lambda in dev and on Fargate elsewhere, so both runtimes stay in acceptance (ADR 0039)."
  }
}
