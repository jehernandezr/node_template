# Tests for the service-base stack with mocked providers: they touch neither AWS nor the backend.
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
  target = data.terraform_remote_state.data
  values = {
    outputs = {
      clients_security_group_id = "sg-0clients"
      db = {
        proxy_endpoint   = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com"
        reader_endpoints = ["nt-dev-postgres-replica-1.x.us-east-1.rds.amazonaws.com"]
        port             = 5432
        kms_key_arn      = "arn:aws:kms:us-east-1:123456789012:key/rds"
      }
      db_service_secret_arns = { identity = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf" }
      service_databases      = { identity = { shards = ["identity_shard_0", "identity_shard_1"], catalog = "catalog" } }
      valkey = {
        endpoint              = "nt-dev-valkey.serverless.use1.cache.amazonaws.com"
        cache_name            = "nt-dev-valkey"
        port                  = 6379
        user_names            = { identity = "nt-dev-identity" }
        connect_resource_arns = { identity = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-dev-valkey"] }
      }
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

run "lambda_api_with_consumer" {
  command = plan

  variables {
    api = { runtime = "lambda" }
    consumers = {
      commands = { queue = "identity-commands" }
    }
  }

  assert {
    condition     = module.component["api"].runtime == "lambda" && module.component["consumer-commands"].runtime == "lambda" && module.component["one-off"].runtime == "fargate"
    error_message = "The Lambda API and the consumers get function roles; the one-off task always runs on Fargate."
  }

  assert {
    condition     = jsondecode(local.lambda_environment["DB_DATABASES"]).shards[1] == "identity_shard_1"
    error_message = "The service receives the map of its databases."
  }

  # Contract with the adapters' configuration schemas: changing a name here
  # requires changing it in backend/libs and backend/.env.example too.
  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["api"]))) == sort(concat(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["DB_SECRET_ARN"]))
    error_message = "The Lambda API receives exactly the variables of the adapter contract."
  }

  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["consumer-commands"]))) == sort(concat(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["DB_SECRET_ARN"]))
    error_message = "A Lambda consumer receives the same variables as the Lambda API."
  }

  assert {
    condition = (
      local.lambda_environment["AWS_ACCOUNT_ID"] == "123456789012" &&
      local.lambda_environment["VALKEY_AUTH"] == "iam-serverless" &&
      local.lambda_environment["VALKEY_TLS"] == "true" &&
      local.lambda_environment["VALKEY_CACHE_NAME"] == "nt-dev-valkey" &&
      local.lambda_environment["VALKEY_USER"] == "nt-dev-identity" &&
      local.lambda_environment["VALKEY_KEY_PREFIX"] == "identity"
    )
    error_message = "Valkey is used with TLS, an IAM token for the serverless cache and the service prefix, which is the one in its ACL."
  }

  assert {
    condition     = strcontains(local.policies["api"]["messaging"], "nt-dev-identity-events") && !strcontains(local.policies["api"]["messaging"], "sqs:ReceiveMessage")
    error_message = "The API publishes according to producers and does not consume queues."
  }

  assert {
    condition     = !strcontains(local.policies["consumer-commands"]["messaging"], "sqs:ReceiveMessage")
    error_message = "The Lambda consumer gets its queue permission with its event source mapping, not from the service policy."
  }

  assert {
    condition     = module.component["api"].kms_key_arn == "arn:aws:kms:us-east-1:123456789012:key/compute-logs" && output.kms_key_arn == module.component["api"].kms_key_arn
    error_message = "The components use the environment logs CMK instead of creating their own."
  }
}

run "fargate_api_with_realtime_and_workers" {
  command = plan

  variables {
    api      = { runtime = "fargate" }
    realtime = {}
    workers = {
      commands = { queue = "identity-commands" }
      reports  = { queue = "identity-reports" }
    }
  }

  assert {
    condition     = local.fargate_secrets["DB_CREDENTIALS"] == "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf"
    error_message = "Fargate receives the credentials through valueFrom."
  }

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["api"]))) == sort(concat(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["AWS_REGION"]))
    error_message = "The Fargate API receives exactly the variables of the adapter contract."
  }

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["worker-commands"]))) == sort(concat(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["AWS_REGION", "QUEUE_URL"]))
    error_message = "A worker receives the Fargate variables and the URL of its queue."
  }

  assert {
    condition     = local.component_environment["worker-commands"]["QUEUE_URL"] == "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-commands"
    error_message = "Each worker gets the URL of its own queue."
  }

  assert {
    condition     = local.fargate_environment["AWS_REGION"] == "us-east-1"
    error_message = "Fargate receives the region."
  }

  assert {
    condition     = !contains(keys(local.policies["realtime"]), "messaging") && !contains(keys(local.policies["api"]), "files")
    error_message = "Realtime neither publishes nor consumes by default, and nobody gets files without asking for them."
  }

  assert {
    condition = (
      strcontains(local.policies["worker-commands"]["messaging"], "nt-dev-identity-commands") &&
      !strcontains(local.policies["worker-commands"]["messaging"], "nt-dev-identity-reports")
    )
    error_message = "Each worker consumes only its own queue."
  }

  assert {
    condition     = output.components["worker-commands"].queue == "identity-commands" && output.components["realtime"].name == "identity-rt" && output.components["worker-reports"].name == "identity-reports"
    error_message = "The service stack reads each component's name and queue from here."
  }
}

run "files_only_where_asked" {
  command = plan

  variables {
    api     = { runtime = "fargate", files_access = true }
    workers = { commands = { queue = "identity-commands" } }
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
        realtime_alb = null
        files_bucket = { name = "nt-dev-files-123456789012", read_write_policy_json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
        ses          = null

        compute_logs_kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
      }
    }
  }

  assert {
    condition     = contains(keys(local.policies["api"]), "files") && !contains(keys(local.policies["worker-commands"]), "files")
    error_message = "Only the component that asks for files receives the bucket policy."
  }

  assert {
    condition     = local.component_environment["api"]["FILES_BUCKET"] == "nt-dev-files-123456789012" && !contains(keys(local.component_environment["worker-commands"]), "FILES_BUCKET")
    error_message = "Only the component with files receives FILES_BUCKET."
  }
}

run "files_need_bucket" {
  command = plan

  variables {
    api = { runtime = "lambda", files_access = true }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_worker_without_queue_runs_the_loops_of_a_service_that_consumes_none" {
  command = plan

  variables {
    service_name    = "tasks"
    database_access = false
    valkey_access   = false
    api             = { runtime = "lambda" }
    workers         = { jobs = {} }
  }

  assert {
    condition     = !contains(keys(local.component_environment["worker-jobs"]), "QUEUE_URL") && !strcontains(try(local.policies["worker-jobs"]["messaging"], ""), "sqs:ReceiveMessage")
    error_message = "A worker without queue gets no QUEUE_URL and consumes nothing."
  }
}

run "a_worker_without_queue_is_rejected_where_the_service_consumes_queues" {
  command = plan

  variables {
    workers = { jobs = {} }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_worker_cannot_take_the_name_of_another_component" {
  command = plan

  variables {
    api     = { runtime = "fargate" }
    workers = { api = { queue = "identity-commands" } }
  }

  expect_failures = [terraform_data.service_check]
}

run "the_api_runtime_is_lambda_or_fargate" {
  command = plan

  variables {
    api = { runtime = "ec2" }
  }

  expect_failures = [var.api]
}

# Applied with the mocked provider, so the role, log group and security group identifiers are known.
run "one_off_task_has_what_the_pipeline_needs_to_run_it" {
  command = apply

  variables {
    api     = { runtime = "fargate" }
    workers = { commands = { queue = "identity-commands" } }
  }

  assert {
    condition = (
      output.one_off_task.cluster_arn == "arn:aws:ecs:us-east-1:123456789012:cluster/nt-dev" &&
      output.one_off_task.subnet_ids == ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"] &&
      output.one_off_task.security_group_ids == [module.component["one-off"].security_group_id, "sg-0clients"]
    )
    error_message = "The one-off task runs on the environment cluster, in the private subnets, with its own security group and the data clients one."
  }

  assert {
    condition = (
      output.one_off_task.task_role_arn == module.component["one-off"].role_arn &&
      output.one_off_task.execution_role_arn == module.component["one-off"].execution_role_arn &&
      output.one_off_task.log_group_name == "/ecs/nt-dev/identity-one-off"
    )
    error_message = "The one-off task has its own task and execution roles and log group."
  }

  assert {
    condition     = alltrue([for key in ["DB_PROXY_HOST", "DB_READER_HOSTS", "DB_PORT", "DB_DATABASES"] : contains(keys(output.one_off_task.environment), key)]) && output.one_off_task.secrets["DB_CREDENTIALS"] == local.fargate_secrets["DB_CREDENTIALS"]
    error_message = "The one-off task carries the DB_* variables and the database credentials."
  }

  assert {
    condition     = output.one_off_task.environment == output.fargate_environment
    error_message = "The one-off task gets the same environment as every Fargate task of the service stack."
  }

  assert {
    condition     = !contains(keys(local.policies["one-off"]), "messaging")
    error_message = "The one-off task publishes and consumes nothing."
  }
}
