# Plans the data stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
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
  mock_resource "aws_db_instance" {
    defaults = {
      master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:rds-master-AbCdEf", kms_key_id = "k", secret_status = "active" }]
    }
  }
  mock_data "aws_serverlessapplicationrepository_application" {
    defaults = { application_id = "arn:aws:serverlessrepo:us-east-1:297356786788:applications/SecretsManagerRDSPostgreSQLRotationSingleUser", semantic_version = "1.1.0", required_capabilities = [] }
  }
}

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id                     = "vpc-0123456789abcdef0"
      data_subnet_ids            = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
      endpoint_security_group_id = "sg-0endpoints"
    }
  }
}

override_data {
  target = data.terraform_remote_state.platform
  values = {
    outputs = {
      alarm_topic_arn = "arn:aws:sns:us-east-1:123456789012:alarms"
      observability   = null
    }
  }
}

run "plans_with_the_environment_values" {
  command = plan

  assert {
    condition     = toset(keys(var.db_services)) == toset([for file in fileset("${path.module}/../../environments/${var.environment}/services", "*/terraform.tfvars") : dirname(file)])
    error_message = "db_services declares exactly the services of the environment."
  }

  assert {
    condition     = module.rds.backup_retention_period == { dev = 7, staging = 14, prod = 35 }[var.environment]
    error_message = "The instance keeps automated backups 7 days in dev, 14 in staging and 35 in prod (ADR 0043)."
  }
}
