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

run "target_groups_get_a_short_prefix_with_the_longest_real_name_prefix" {
  command = plan

  variables {
    name_prefix           = "node-template-staging"
    service_name          = "notifications-api"
    container_port        = 3000
    enable_load_balancer  = true
    alb_listener_arn      = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-api/1/2"
    alb_security_group_id = "sg-0api"
    path_patterns         = ["/v1/notifications"]
  }

  assert {
    condition     = output.target_group_name_prefix == "notif-" && aws_lb_target_group.this[0].name_prefix == "notif-"
    error_message = "The target group takes a prefix of at most 6 characters and AWS adds a unique suffix, so the API and realtime of one service never collide and the name never ends in a hyphen."
  }
}

run "a_worker_named_after_its_queue_fits_the_iam_role_name_limit" {
  command = plan

  variables {
    name_prefix  = "node-template-staging"
    service_name = "notifications-realtime-control"
  }

  assert {
    condition     = length(aws_iam_role.execution.name) <= 64 && length(aws_iam_role.task.name) <= 64
    error_message = "With the longest real name_prefix, a worker named <service>-<queue> keeps its role names within 64 characters."
  }
}
