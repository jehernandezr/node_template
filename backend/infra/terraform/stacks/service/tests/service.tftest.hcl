# Tests for the service stack with mocked providers. The service-base outputs come from a mocked remote state: they touch neither AWS nor the backend.
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
  region       = "us-east-1"
  domain       = "example.test"
  environment  = "dev"
  name_prefix  = "nt-dev"
  state_bucket = "nt-dev-tfstate"
  service_name = "identity"
  image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/identity@sha256:0000000000000000000000000000000000000000000000000000000000000000"
  lambda_package = {
    s3_bucket = "nt-dev-artifacts"
    s3_key    = "identity/abc.zip"
  }
}

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id             = "vpc-0123456789abcdef0"
      private_subnet_ids = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
    }
  }
}

override_data {
  target = data.terraform_remote_state.platform
  values = {
    outputs = {
      alarm_topic_arn = "arn:aws:sns:us-east-1:123456789012:nt-dev-alarms"
      ecs_cluster     = { arn = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev", name = "nt-dev", kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/ecs" }
      observability   = null
      http_api = {
        id                       = "abc123"
        execution_arn            = "arn:aws:execute-api:us-east-1:123456789012:abc123"
        endpoint_host            = "abc123.execute-api.us-east-1.amazonaws.com"
        authorizer_id            = "auth01"
        origin_verify_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev-api/origin-verify-AbCdEf"
        origin_verify_kms_arn    = "arn:aws:kms:us-east-1:123456789012:key/api"
        vpc_link_id              = "vl-0123"
      }
      api_alb      = { listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-dev-api/1/2", security_group_id = "sg-0api" }
      realtime_alb = { listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-dev-rt/1/3", security_group_id = "sg-0rt", dns_name = "rt.example.com", zone_id = "Z1" }
      files_bucket = null
      ses          = null

      compute_logs_kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
    }
  }
}

override_data {
  target = data.terraform_remote_state.messaging
  values = {
    outputs = {
      name_prefix = "nt-dev"
      kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/messaging"
      topic_arns  = { "identity-events" = "arn:aws:sns:us-east-1:123456789012:nt-dev-identity-events" }
      queue_arns = {
        "identity-commands" = "arn:aws:sqs:us-east-1:123456789012:nt-dev-identity-commands"
        "identity-reports"  = "arn:aws:sqs:us-east-1:123456789012:nt-dev-identity-reports"
      }
      queue_urls = {
        "identity-commands" = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-commands"
        "identity-reports"  = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-reports"
      }
      queue_names = {
        "identity-commands" = "nt-dev-identity-commands"
        "identity-reports"  = "nt-dev-identity-reports"
      }
      service_access = {
        identity = { publish_topics = ["identity-events"], send_queues = [], consume_queues = ["identity-commands", "identity-reports"] }
      }
    }
  }
}

# identity as service-base defines it with a Fargate API, realtime and two workers.
override_data {
  target = data.terraform_remote_state.service_base
  values = {
    outputs = {
      service_name = "identity"
      components = {
        "api" = {
          name               = "identity-api"
          runtime            = "fargate"
          queue              = null
          role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-api-task"
          role_name          = "nt-dev-identity-api-task"
          execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-api-execution"
          log_group_name     = "/ecs/nt-dev/identity-api"
          security_group_id  = "sg-0identityapi"
          environment        = {}
        }
        "realtime" = {
          name               = "identity-rt"
          runtime            = "fargate"
          queue              = null
          role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-rt-task"
          role_name          = "nt-dev-identity-rt-task"
          execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-rt-execution"
          log_group_name     = "/ecs/nt-dev/identity-rt"
          security_group_id  = "sg-0identityrt"
          environment        = {}
        }
        "worker-commands" = {
          name               = "identity-commands"
          runtime            = "fargate"
          queue              = "identity-commands"
          role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-commands-task"
          role_name          = "nt-dev-identity-commands-task"
          execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-commands-execution"
          log_group_name     = "/ecs/nt-dev/identity-commands"
          security_group_id  = "sg-0identitycommands"
          environment        = { QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-commands" }
        }
        "worker-reports" = {
          name               = "identity-reports"
          runtime            = "fargate"
          queue              = "identity-reports"
          role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-reports-task"
          role_name          = "nt-dev-identity-reports-task"
          execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-reports-execution"
          log_group_name     = "/ecs/nt-dev/identity-reports"
          security_group_id  = "sg-0identityreports"
          environment        = { QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-reports" }
        }
        "one-off" = {
          name               = "identity-one-off"
          runtime            = "fargate"
          queue              = null
          role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-one-off-task"
          role_name          = "nt-dev-identity-one-off-task"
          execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-one-off-execution"
          log_group_name     = "/ecs/nt-dev/identity-one-off"
          security_group_id  = "sg-0identityoneoff"
          environment        = {}
        }
      }
      fargate_environment     = { SERVICE_NAME = "identity", AWS_REGION = "us-east-1", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com" }
      lambda_environment      = { SERVICE_NAME = "identity", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", DB_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf" }
      fargate_secrets         = { DB_CREDENTIALS = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf" }
      lambda_secret_arns      = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf"]
      kms_key_arn             = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
      data_security_group_ids = ["sg-0clients"]
      enable_execute_command  = false
    }
  }
}

run "reads_the_service_base_outputs_from_remote_state" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = {}
      reports  = {}
    }
  }

  assert {
    condition     = length(module.api_lambda) == 0 && length(module.api_fargate) == 1 && length(module.realtime) == 1 && output.api_runtime == "fargate"
    error_message = "The API runtime comes from service-base."
  }

  assert {
    condition     = tolist(local.api_path_patterns) == tolist(["/identity", "/identity/*"])
    error_message = "The internal ALB routes the same prefixes as the API."
  }

  assert {
    condition     = output.ecs_services["api"].task_role_arn == "arn:aws:iam::123456789012:role/nt-dev-identity-api-task" && output.ecs_services["commands"].log_group_name == "/ecs/nt-dev/identity-commands"
    error_message = "Each ECS service runs with the task role and log group of its service-base component."
  }

  assert {
    condition     = module.worker["commands"].service_name == "identity-commands" && module.realtime[0].service_name == "identity-rt"
    error_message = "Each component keeps the name service-base gave its role and log group."
  }

  assert {
    condition     = local.fargate_environment["api"] == { SERVICE_NAME = "identity", AWS_REGION = "us-east-1", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com" }
    error_message = "The API gets the shared Fargate environment of service-base, the one its one-off task gets."
  }

  assert {
    condition     = local.fargate_environment["worker-commands"]["QUEUE_URL"] == "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-commands" && !contains(keys(local.fargate_environment["worker-reports"]), "files")
    error_message = "A worker adds the variables of its own component, such as the URL of its queue."
  }

  assert {
    condition     = module.worker["commands"].max_capacity == 4 && module.worker["commands"].min_capacity == 1
    error_message = "A worker with a queue scales on it from one task."
  }
}

run "lambda_api_with_consumer" {
  command = plan

  variables {
    api = { route_prefixes = ["/identity"] }
    consumers = {
      commands = { handler = "lambda.sqsHandler" }
    }
  }

  override_data {
    target = data.terraform_remote_state.service_base
    values = {
      outputs = {
        service_name = "identity"
        components = {
          "api" = {
            name               = "identity-api"
            runtime            = "lambda"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-api"
            role_name          = "nt-dev-identity-api"
            execution_role_arn = null
            log_group_name     = "/aws/lambda/nt-dev-identity-api"
            security_group_id  = "sg-0identityapi"
            environment        = {}
          }
          "consumer-commands" = {
            name               = "identity-commands"
            runtime            = "lambda"
            queue              = "identity-commands"
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-commands"
            role_name          = "nt-dev-identity-commands"
            execution_role_arn = null
            log_group_name     = "/aws/lambda/nt-dev-identity-commands"
            security_group_id  = "sg-0identitycommands"
            environment        = {}
          }
          "one-off" = {
            name               = "identity-one-off"
            runtime            = "fargate"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-identity-one-off-task"
            role_name          = "nt-dev-identity-one-off-task"
            execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-identity-one-off-execution"
            log_group_name     = "/ecs/nt-dev/identity-one-off"
            security_group_id  = "sg-0identityoneoff"
            environment        = {}
          }
        }
        fargate_environment     = { SERVICE_NAME = "identity", AWS_REGION = "us-east-1", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com" }
        lambda_environment      = { SERVICE_NAME = "identity", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", DB_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf" }
        fargate_secrets         = { DB_CREDENTIALS = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf" }
        lambda_secret_arns      = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf"]
        kms_key_arn             = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
        data_security_group_ids = ["sg-0clients"]
        enable_execute_command  = false
      }
    }
  }

  assert {
    condition     = length(module.api_lambda) == 1 && length(module.api_fargate) == 0
    error_message = "The Lambda API does not create an ECS service."
  }

  assert {
    condition     = toset(module.api_routes[0].route_keys) == toset(["ANY /identity", "ANY /identity/{proxy+}"])
    error_message = "Each prefix creates its root and its proxy."
  }

  assert {
    condition     = output.lambda_functions["api"].role_arn == "arn:aws:iam::123456789012:role/nt-dev-identity-api" && output.lambda_functions["commands"].role_arn == "arn:aws:iam::123456789012:role/nt-dev-identity-commands"
    error_message = "The functions run with the roles of service-base."
  }

  assert {
    condition     = local.lambda_environment["consumer-commands"]["DB_SECRET_ARN"] == "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf"
    error_message = "The functions get the shared Lambda environment of service-base."
  }
}

run "a_worker_without_queue_runs_exactly_one_task" {
  command = plan

  variables {
    service_name = "tasks"
    api          = { route_prefixes = ["/v1/tasks"] }
    workers      = { jobs = {} }
  }

  override_data {
    target = data.terraform_remote_state.service_base
    values = {
      outputs = {
        service_name = "tasks"
        components = {
          "api" = {
            name               = "tasks-api"
            runtime            = "lambda"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-tasks-api"
            role_name          = "nt-dev-tasks-api"
            execution_role_arn = null
            log_group_name     = "/aws/lambda/nt-dev-tasks-api"
            security_group_id  = "sg-0tasksapi"
            environment        = {}
          }
          "worker-jobs" = {
            name               = "tasks-jobs"
            runtime            = "fargate"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-tasks-jobs-task"
            role_name          = "nt-dev-tasks-jobs-task"
            execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-tasks-jobs-execution"
            log_group_name     = "/ecs/nt-dev/tasks-jobs"
            security_group_id  = "sg-0tasksjobs"
            environment        = {}
          }
          "one-off" = {
            name               = "tasks-one-off"
            runtime            = "fargate"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-tasks-one-off-task"
            role_name          = "nt-dev-tasks-one-off-task"
            execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-tasks-one-off-execution"
            log_group_name     = "/ecs/nt-dev/tasks-one-off"
            security_group_id  = "sg-0tasksoneoff"
            environment        = {}
          }
        }
        fargate_environment     = { SERVICE_NAME = "tasks", AWS_REGION = "us-east-1", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com" }
        lambda_environment      = { SERVICE_NAME = "tasks", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", DB_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/tasks-AbCdEf" }
        fargate_secrets         = { DB_CREDENTIALS = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/tasks-AbCdEf" }
        lambda_secret_arns      = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/tasks-AbCdEf"]
        kms_key_arn             = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
        data_security_group_ids = ["sg-0clients"]
        enable_execute_command  = false
      }
    }
  }

  assert {
    condition     = module.worker["jobs"].min_capacity == 1 && module.worker["jobs"].max_capacity == 1
    error_message = "A worker without queue runs exactly one task: there is no queue to scale on."
  }
}

run "a_component_missing_from_service_base_is_rejected" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = {}
      reports  = {}
      ghost    = {}
    }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_component_of_service_base_missing_here_is_rejected" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/socket.io/*"] }
    workers  = { commands = {} }
  }

  expect_failures = [terraform_data.service_check]
}

run "the_service_base_of_another_service_is_rejected" {
  command = plan

  variables {
    service_name = "tasks"
    api          = { route_prefixes = ["/identity"] }
    realtime     = { path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = {}
      reports  = {}
    }
  }

  expect_failures = [terraform_data.service_check]
}

run "listener_priorities_come_from_the_fixed_registry" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = {}
      reports  = {}
    }
  }

  assert {
    condition     = local.listener_priorities == jsondecode(file("../../listener-priorities.json")) && local.listener_priorities["identity"] == 20
    error_message = "Each service takes its own entry of listener-priorities.json, which does not move when another service is added."
  }

  assert {
    condition     = length(distinct(values(local.listener_priorities))) == length(local.listener_priorities) && alltrue([for priority in values(local.listener_priorities) : priority >= 1 && priority <= 50000 && floor(priority) == priority])
    error_message = "No two services share a listener priority, and each one is an integer from 1 to 50000, as ALB requires."
  }

  assert {
    condition     = module.api_fargate[0].listener_rule_priority == 20 && module.realtime[0].listener_rule_priority == 20
    error_message = "The API and realtime rules of identity use its registry priority, each on its own listener."
  }
}

run "a_service_without_a_registry_entry_has_no_listener_priority" {
  command = plan

  variables {
    service_name = "audit"
    api          = { route_prefixes = ["/audit"] }
  }

  override_data {
    target = data.terraform_remote_state.service_base
    values = {
      outputs = {
        service_name = "audit"
        components = {
          "api" = {
            name               = "audit-api"
            runtime            = "fargate"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-audit-api-task"
            role_name          = "nt-dev-audit-api-task"
            execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-audit-api-execution"
            log_group_name     = "/ecs/nt-dev/audit-api"
            security_group_id  = "sg-0auditapi"
            environment        = {}
          }
          "one-off" = {
            name               = "audit-one-off"
            runtime            = "fargate"
            queue              = null
            role_arn           = "arn:aws:iam::123456789012:role/nt-dev-audit-one-off-task"
            role_name          = "nt-dev-audit-one-off-task"
            execution_role_arn = "arn:aws:iam::123456789012:role/nt-dev-audit-one-off-execution"
            log_group_name     = "/ecs/nt-dev/audit-one-off"
            security_group_id  = "sg-0auditoneoff"
            environment        = {}
          }
        }
        fargate_environment     = { SERVICE_NAME = "audit", AWS_REGION = "us-east-1", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com" }
        lambda_environment      = { SERVICE_NAME = "audit", DB_PROXY_HOST = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", DB_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/audit-AbCdEf" }
        fargate_secrets         = { DB_CREDENTIALS = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/audit-AbCdEf" }
        lambda_secret_arns      = ["arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/audit-AbCdEf"]
        kms_key_arn             = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
        data_security_group_ids = ["sg-0clients"]
        enable_execute_command  = false
      }
    }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_worker_cannot_scale_to_zero" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = { min_capacity = 0 }
      reports  = {}
    }
  }

  expect_failures = [var.workers]
}

run "route_prefixes_never_expose_the_internal_api" {
  command = plan

  variables {
    api = { route_prefixes = ["/v1/identity", "/internal/operations"] }
  }

  expect_failures = [var.api]
}

run "realtime_paths_never_expose_the_internal_api" {
  command = plan

  variables {
    realtime = { path_patterns = ["/internal/*"] }
  }

  expect_failures = [var.realtime]
}

run "a_realtime_wildcard_from_the_root_would_reach_the_internal_api" {
  command = plan

  variables {
    realtime = { path_patterns = ["/*"] }
  }

  expect_failures = [var.realtime]
}

run "a_realtime_pattern_that_starts_with_a_wildcard_would_reach_the_internal_api" {
  command = plan

  variables {
    realtime = { path_patterns = ["*/stream"] }
  }

  expect_failures = [var.realtime]
}

run "a_realtime_wildcard_inside_the_internal_prefix_would_reach_the_internal_api" {
  command = plan

  variables {
    realtime = { path_patterns = ["/in*"] }
  }

  expect_failures = [var.realtime]
}

run "a_realtime_rule_on_the_root_path_is_rejected" {
  command = plan

  variables {
    realtime = { path_patterns = ["/"] }
  }

  expect_failures = [var.realtime]
}

run "a_realtime_rule_with_only_a_host_would_route_every_path_of_that_host" {
  command = plan

  variables {
    realtime = { host_headers = ["rt.example.test"] }
  }

  expect_failures = [var.realtime]
}

run "a_route_prefix_on_the_root_would_reach_the_internal_api" {
  command = plan

  variables {
    api = { route_prefixes = ["/"] }
  }

  expect_failures = [var.api]
}

run "realtime_paths_outside_the_internal_api_are_accepted" {
  command = plan

  variables {
    api      = { route_prefixes = ["/identity"] }
    realtime = { path_patterns = ["/identity/stream", "/socket.io/*"], host_headers = ["rt.example.test"] }
    workers = {
      commands = {}
      reports  = {}
    }
  }

  assert {
    condition     = length(module.realtime) == 1
    error_message = "Patterns with a fixed prefix outside /internal reach the realtime rule."
  }
}
