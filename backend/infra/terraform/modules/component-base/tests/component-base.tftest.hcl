# Tests for the component-base module with mocked providers: they touch neither AWS nor a backend.
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
  name_prefix = "nt-dev"
  name        = "tasks-api"
  vpc_id      = "vpc-0123456789abcdef0"
  kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
}

run "a_fargate_component_gets_execution_and_task_roles_and_an_ecs_log_group" {
  command = plan

  variables {
    runtime       = "fargate"
    task_policies = { messaging = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }

  assert {
    condition     = length(aws_iam_role.execution) == 1 && length(aws_iam_role.task) == 1 && length(aws_iam_role.function) == 0
    error_message = "A Fargate component gets an execution role and a task role, and no function role."
  }

  assert {
    condition     = aws_cloudwatch_log_group.this.name == "/ecs/nt-dev/tasks-api" && aws_cloudwatch_log_group.this.kms_key_id == var.kms_key_arn
    error_message = "The Fargate log group lives under /ecs/<name_prefix>/ and uses the given CMK."
  }

  assert {
    condition     = aws_iam_role_policy.task["messaging"].name == "messaging"
    error_message = "The component policies go to the task role."
  }

  assert {
    condition     = aws_security_group.this.name == "nt-dev-tasks-api" && aws_security_group.this.description == "Network of nt-dev-tasks-api"
    error_message = "The security group name and description do not depend on the runtime, so a runtime switch keeps the group that running tasks or functions still use."
  }
}

run "a_lambda_component_gets_a_function_role_and_its_log_group" {
  command = plan

  variables {
    runtime = "lambda"
  }

  assert {
    condition     = length(aws_iam_role.function) == 1 && length(aws_iam_role.execution) == 0 && length(aws_iam_role.task) == 0
    error_message = "A Lambda component gets a function role only."
  }

  assert {
    condition     = aws_cloudwatch_log_group.this.name == "/aws/lambda/nt-dev-tasks-api" && length(aws_iam_role_policy_attachment.vpc) == 1
    error_message = "The function log group is the one Lambda writes to, and the role may attach to the VPC."
  }

  assert {
    condition     = aws_security_group.this.name == "nt-dev-tasks-api" && aws_security_group.this.description == "Network of nt-dev-tasks-api"
    error_message = "The security group name and description are the same as on Fargate, so a runtime switch does not replace the group."
  }
}

run "ecs_exec_is_granted_only_when_asked" {
  command = plan

  variables {
    runtime                = "fargate"
    enable_execute_command = true
  }

  assert {
    condition     = length(aws_iam_role_policy.exec) == 1
    error_message = "ECS Exec adds its channels to the task role."
  }
}

run "a_worker_named_after_its_queue_fits_the_iam_role_name_limit" {
  command = plan

  variables {
    runtime     = "fargate"
    name_prefix = "node-template-staging"
    name        = "notifications-realtime-control"
  }

  assert {
    condition     = length(aws_iam_role.execution[0].name) <= 64 && length(aws_iam_role.task[0].name) <= 64
    error_message = "With the longest real name_prefix, a worker named <service>-<queue> keeps its role names within 64 characters."
  }
}

run "without_a_key_the_component_creates_its_own" {
  command = plan

  variables {
    runtime     = "lambda"
    kms_key_arn = null
  }

  assert {
    condition     = length(module.logs_kms) == 1
    error_message = "Without kms_key_arn the component creates the CMK of its logs."
  }
}

run "a_lambda_with_secrets_may_read_them_in_one_batch" {
  command = plan

  variables {
    runtime     = "lambda"
    secret_arns = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/tasks-api/data-key-AbCdEf"]
  }

  assert {
    condition     = length([for statement in data.aws_iam_policy_document.function.statement : statement if statement.sid == "ReadSecrets" && toset(statement.actions) == toset(["secretsmanager:GetSecretValue"]) && toset(statement.resources) == toset(var.secret_arns)]) == 1
    error_message = "The function role may read each secret of SECRETS_MAP, and only those."
  }

  assert {
    condition     = length([for statement in data.aws_iam_policy_document.function.statement : statement if statement.sid == "BatchReadSecrets" && toset(statement.actions) == toset(["secretsmanager:BatchGetSecretValue"]) && toset(statement.resources) == toset(["*"])]) == 1
    error_message = "BatchGetSecretValue has no resource scope, so the function role needs it on every resource to read SECRETS_MAP in one call."
  }
}

run "a_lambda_without_secrets_gets_no_batch_read" {
  command = plan

  variables {
    runtime = "lambda"
  }

  assert {
    condition     = length([for statement in data.aws_iam_policy_document.function.statement : statement if contains(["ReadSecrets", "BatchReadSecrets"], statement.sid)]) == 0
    error_message = "A function without secrets may not read any."
  }
}
