# Plans one service-base stack with the real values of an environment and mocked providers. tf-validate.mjs runs
# it once per service of each environment with -var-file common.tfvars and -var-file the service's
# base/terraform.tfvars, and puts before it the override_data blocks that EnvironmentMocks
# (backend/infra/scripts/environment-mocks.mjs) builds for that environment: the platform outputs follow its
# platform tfvars, the data outputs its data tfvars, the messaging outputs topology.json and the service outputs
# the components the service's terraform.tfvars runs. A failure here is a contradiction between the service values
# and the other stacks of the same environment.

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
    condition     = sort([for key in keys(output.one_off_task.environment) : key if startswith(key, "DB_")]) == sort(jsondecode(file("${path.module}/../../database-config.json")).keys.iam)
    error_message = "The one-off task carries exactly the DB_* keys databaseConfigSchema expects with DB_AUTH=iam (database-config.json)."
  }

  assert {
    condition = (
      output.migrate_task.environment["DB_USER"] == "${var.service_name}_owner" &&
      !contains(keys(output.migrate_task.environment), "DB_READER_USER") &&
      alltrue([for instance in values(jsondecode(output.migrate_task.environment["DB_INSTANCES"])) : length(instance.replicas) == 0]) &&
      merge(output.migrate_task.environment, {
        DB_USER        = output.fargate_environment["DB_USER"]
        DB_READER_USER = output.fargate_environment["DB_READER_USER"]
        DB_INSTANCES   = output.fargate_environment["DB_INSTANCES"]
      }) == output.fargate_environment
    )
    error_message = "The migrate task migrates as the owner role on the primary alone, with the environment every Fargate task of the service gets otherwise (ADR 0041, ADR 0043)."
  }

  assert {
    condition     = output.one_off_task.environment == output.fargate_environment && output.one_off_task.environment["DB_USER"] == "${var.service_name}_app"
    error_message = "The seed one-off task runs as the app role (ADR 0041)."
  }

  assert {
    condition     = alltrue([for version in values(aws_secretsmanager_secret_version.generated) : version.secret_string == null && version.secret_string_wo_version == 1])
    error_message = "No generated secret value reaches the plan or the state: each one is written once through a write-only attribute (ADR 0041)."
  }

  assert {
    condition     = length(aws_secretsmanager_secret.smoke_account) == (var.service_name == "identity" && contains(["dev", "staging"], var.environment) ? 1 : 0) && length(aws_secretsmanager_secret_policy.smoke_account) == length(aws_secretsmanager_secret.smoke_account)
    error_message = "Identity owns the SMOKE_ACCOUNT container, with the policy that lets only the deploy role write it, in dev and staging and never in prod (ADR 0043)."
  }

  assert {
    condition     = var.service_name != "identity" || sort(keys(local.fargate_secrets)) == sort(["IDENTITY_API_KEY_PEPPER", "IDENTITY_DATA_KEY", "IDENTITY_DEVICE_ID_KEY", "IDENTITY_EMAIL_PEPPER", "IDENTITY_SIGNING_KEYS", "IDENTITY_TOKEN_PEPPER"])
    error_message = "Identity receives every secret of its configuration from this stack (ADR 0041)."
  }

  assert {
    condition     = output.fargate_environment["WEB_ORIGINS"] == join(",", var.web_origins)
    error_message = "Every service accepts the web origins of common.tfvars."
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
