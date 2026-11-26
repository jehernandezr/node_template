# Tests for the service-fargate module with mocked providers: they touch neither AWS nor a backend.
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
  name_prefix  = "nt-dev"
  service_name = "tasks"
  environment  = "dev"
  cluster_arn  = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev"
  cluster_name = "nt-dev"
  vpc_id       = "vpc-0123456789abcdef0"
  subnet_ids   = ["subnet-0123456789abcdef0"]
  image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/tasks@sha256:0000000000000000000000000000000000000000000000000000000000000000"
}

run "worker_runs_worker_entry_point_by_default" {
  command = plan

  assert {
    condition     = jsondecode(aws_ecs_task_definition.this.container_definitions)[0].command == ["node", "worker.mjs"]
    error_message = "A task without container_port must run node worker.mjs unless command is set."
  }
}

run "api_keeps_the_image_command" {
  command = plan

  variables {
    container_port = 3000
  }

  assert {
    condition     = !contains(keys(jsondecode(aws_ecs_task_definition.this.container_definitions)[0]), "command")
    error_message = "A task with container_port must run the image command, node main.mjs."
  }
}

run "explicit_command_wins" {
  command = plan

  variables {
    command = ["node", "seed.mjs"]
  }

  assert {
    condition     = jsondecode(aws_ecs_task_definition.this.container_definitions)[0].command == ["node", "seed.mjs"]
    error_message = "An explicit command must replace the default."
  }
}
