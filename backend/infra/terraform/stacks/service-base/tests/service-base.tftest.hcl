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
  regions      = { us = { aws_region = "us-east-1", api_base_url = "https://api.example.test", issuer = "https://api.example.test" } }
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
      db_roles          = { identity = { owner = "identity_owner", app = "identity_app", reader = "identity_reader" } }
      service_databases = { identity = { shards = ["identity_shard_0", "identity_shard_1"], catalog = "identity_catalog" } }
      db_connect_arns = {
        identity = {
          app    = ["arn:aws:rds-db:us-east-1:123456789012:dbuser:prx-0123456789abcdef0/identity_app"]
          owner  = ["arn:aws:rds-db:us-east-1:123456789012:dbuser:prx-0123456789abcdef0/identity_owner"]
          reader = ["arn:aws:rds-db:us-east-1:123456789012:dbuser:db-REPLICA1/identity_reader"]
        }
      }
      valkey = {
        endpoint   = "nt-dev-valkey.serverless.use1.cache.amazonaws.com"
        cache_name = "nt-dev-valkey"
        port       = 6379
        user_names = { identity = "nt-dev-identity", tasks = "nt-dev-tasks" }
        connect_resource_arns = {
          identity = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-dev-valkey"]
          tasks    = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-dev-valkey"]
        }
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

# The service stack has not been applied yet: it runs nothing.
override_data {
  target = data.terraform_remote_state.service
  values = {
    outputs = { components = [], service_name = null }
  }
}

# The first apply of this stack.
override_data {
  target = data.terraform_remote_state.service_base
  values = {
    outputs = { service_applied = false }
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
    condition = (
      local.lambda_environment["DB_AUTH"] == "iam" &&
      local.lambda_environment["DB_USER"] == "identity_app" &&
      local.lambda_environment["DB_READER_USER"] == "identity_reader" &&
      local.lambda_environment["DB_SSL"] == "true" &&
      local.lambda_environment["DB_CATALOG_NAME"] == "identity_catalog" &&
      local.lambda_environment["DB_CATALOG_INSTANCE"] == "main"
    )
    error_message = "The service signs IAM tokens as its app role, reads the replicas as its reader role and finds its own catalog."
  }

  assert {
    condition = jsondecode(local.lambda_environment["DB_INSTANCES"]) == {
      main = {
        primary  = { host = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", port = 5432 }
        replicas = [{ host = "nt-dev-postgres-replica-1.x.us-east-1.rds.amazonaws.com", port = 5432 }]
      }
    }
    error_message = "DB_INSTANCES has RDS Proxy as the primary and the replicas, in the shape databaseConfigSchema reads."
  }

  # Guard: the DB_* keys are exactly the keys databaseConfigSchema expects with DB_AUTH=iam, which the contract
  # export writes to database-config.json (nx run contracts-export:export).
  assert {
    condition     = sort([for key in keys(local.lambda_environment) : key if startswith(key, "DB_")]) == sort(jsondecode(file("${path.module}/../../database-config.json")).keys.iam)
    error_message = "The DB_* variables differ from the keys of databaseConfigSchema in database-config.json."
  }

  assert {
    condition     = strcontains(local.policies["api"]["database-connect"], "dbuser:prx-0123456789abcdef0/identity_app") && strcontains(local.policies["api"]["database-connect"], "/identity_reader") && !strcontains(local.policies["api"]["database-connect"], "identity_owner")
    error_message = "The runtime connects as the app role through the proxy and as the reader on the replicas, never as the owner."
  }

  assert {
    condition     = length(local.lambda_secrets) == 0 && !contains(keys(local.lambda_environment), "DB_SECRET_ARN")
    error_message = "No component reads a database secret: the pool signs IAM tokens."
  }

  # Contract with the adapters' configuration schemas: changing a name here
  # requires changing it in backend/libs and backend/.env.example too.
  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["api"]))) == sort(concat(["AUTH_ISSUER", "AWS_ACCOUNT_ID", "DB_AUTH", "DB_CATALOG_INSTANCE", "DB_CATALOG_NAME", "DB_CONNECT_TIMEOUT_MS", "DB_INSTANCES", "DB_POOL_MAX", "DB_READER_USER", "DB_SSL", "DB_STATEMENT_TIMEOUT_MS", "DB_USER", "DEPLOY_ENVIRONMENT", "IDENTITY_ISSUER", "IDENTITY_REGION", "MESSAGING_NAME_PREFIX", "REGIONS", "SERVICE_NAME", "SERVICE_REGION", "TENANT_MOVE_STRATEGY", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], []))
    error_message = "The Lambda API receives exactly the variables of the adapter contract."
  }

  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["consumer-commands"]))) == sort(concat(["AUTH_ISSUER", "AWS_ACCOUNT_ID", "DB_AUTH", "DB_CATALOG_INSTANCE", "DB_CATALOG_NAME", "DB_CONNECT_TIMEOUT_MS", "DB_INSTANCES", "DB_POOL_MAX", "DB_READER_USER", "DB_SSL", "DB_STATEMENT_TIMEOUT_MS", "DB_USER", "DEPLOY_ENVIRONMENT", "IDENTITY_ISSUER", "IDENTITY_REGION", "MESSAGING_NAME_PREFIX", "REGIONS", "SERVICE_NAME", "SERVICE_REGION", "TENANT_MOVE_STRATEGY", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], []))
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
    condition     = length(local.fargate_secrets) == 0 && length(local.fargate_execution_reads) == 0
    error_message = "Fargate receives no database credentials: the pool signs IAM tokens with the task role."
  }

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["api"]))) == sort(concat(["AUTH_ISSUER", "AWS_ACCOUNT_ID", "DB_AUTH", "DB_CATALOG_INSTANCE", "DB_CATALOG_NAME", "DB_CONNECT_TIMEOUT_MS", "DB_INSTANCES", "DB_POOL_MAX", "DB_READER_USER", "DB_SSL", "DB_STATEMENT_TIMEOUT_MS", "DB_USER", "DEPLOY_ENVIRONMENT", "IDENTITY_ISSUER", "IDENTITY_REGION", "MESSAGING_NAME_PREFIX", "REGIONS", "SERVICE_NAME", "SERVICE_REGION", "TENANT_MOVE_STRATEGY", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["AWS_REGION"]))
    error_message = "The Fargate API receives exactly the variables of the adapter contract."
  }

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["worker-commands"]))) == sort(concat(["AUTH_ISSUER", "AWS_ACCOUNT_ID", "DB_AUTH", "DB_CATALOG_INSTANCE", "DB_CATALOG_NAME", "DB_CONNECT_TIMEOUT_MS", "DB_INSTANCES", "DB_POOL_MAX", "DB_READER_USER", "DB_SSL", "DB_STATEMENT_TIMEOUT_MS", "DB_USER", "DEPLOY_ENVIRONMENT", "IDENTITY_ISSUER", "IDENTITY_REGION", "MESSAGING_NAME_PREFIX", "REGIONS", "SERVICE_NAME", "SERVICE_REGION", "TENANT_MOVE_STRATEGY", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["AWS_REGION", "QUEUE_URL"]))
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

run "the_connect_timeout_reaches_every_component" {
  command = plan

  variables {
    api                         = { runtime = "lambda" }
    database_connect_timeout_ms = 2500
  }

  assert {
    condition     = local.lambda_environment["DB_CONNECT_TIMEOUT_MS"] == "2500" && local.fargate_environment["DB_CONNECT_TIMEOUT_MS"] == "2500" && local.migrate_environment["DB_CONNECT_TIMEOUT_MS"] == "2500"
    error_message = "Every component and one-off task gives up a connection after database_connect_timeout_ms."
  }
}

run "a_connect_timeout_below_a_millisecond_is_rejected" {
  command = plan

  variables {
    api                         = { runtime = "lambda" }
    database_connect_timeout_ms = 0
  }

  expect_failures = [var.database_connect_timeout_ms]
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
    api             = { runtime = "lambda" }
    workers         = { jobs = {} }
  }

  assert {
    condition     = !contains(keys(local.component_environment["worker-jobs"]), "QUEUE_URL") && !strcontains(try(local.policies["worker-jobs"]["messaging"], ""), "sqs:ReceiveMessage")
    error_message = "A worker without queue gets no QUEUE_URL and consumes nothing."
  }
}

run "a_service_without_its_valkey_user_is_rejected" {
  command = plan

  variables {
    service_name    = "billing"
    database_access = false
    api             = { runtime = "lambda" }
  }

  expect_failures = [terraform_data.service_check]
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

run "a_component_the_service_stack_still_runs_cannot_be_removed" {
  command = plan

  variables {
    api       = { runtime = "lambda" }
    consumers = { commands = { queue = "identity-commands" } }
  }

  override_data {
    target = data.terraform_remote_state.service
    values = {
      outputs = { components = ["api", "consumer-commands", "worker-reports"], service_name = "identity" }
    }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_component_the_service_stack_runs_stays_while_it_is_declared" {
  command = plan

  variables {
    api       = { runtime = "fargate" }
    consumers = { commands = { queue = "identity-commands" } }
  }

  override_data {
    target = data.terraform_remote_state.service
    values = {
      outputs = { components = ["api", "consumer-commands"], service_name = "identity" }
    }
  }

  assert {
    condition     = length(local.running_dropped) == 0 && module.component["api"].runtime == "fargate"
    error_message = "Switching the runtime of a running component keeps it: only its roles change, and its security group stays."
  }
}

run "the_first_apply_does_not_need_the_service_state" {
  command = plan

  variables {
    api = { runtime = "lambda" }
  }

  assert {
    condition     = !output.service_applied
    error_message = "Before the service stack is applied, service-base records that it has not been."
  }
}

run "a_found_service_state_is_recorded_as_applied" {
  command = plan

  variables {
    api = { runtime = "lambda" }
  }

  override_data {
    target = data.terraform_remote_state.service
    values = {
      outputs = { components = ["api"], service_name = "identity" }
    }
  }

  assert {
    condition     = output.service_applied
    error_message = "Once the service state is found, service-base records it, so a later plan cannot lose it unnoticed."
  }
}

run "the_service_state_of_another_service_is_rejected" {
  command = plan

  variables {
    api = { runtime = "lambda" }
  }

  override_data {
    target = data.terraform_remote_state.service
    values = {
      outputs = { components = ["api"], service_name = "tasks" }
    }
  }

  expect_failures = [terraform_data.service_check]
}

run "a_service_state_that_is_no_longer_found_is_rejected" {
  command = plan

  variables {
    api = { runtime = "lambda" }
  }

  override_data {
    target = data.terraform_remote_state.service_base
    values = {
      outputs = { service_applied = true }
    }
  }

  expect_failures = [terraform_data.service_check]
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
    condition     = output.one_off_task.environment["DB_AUTH"] == "iam" && length(output.one_off_task.secrets) == 0
    error_message = "The one-off task signs an IAM token and gets no secret."
  }

  assert {
    condition     = output.one_off_task.environment == output.fargate_environment && output.one_off_task.environment["DB_USER"] == "identity_app"
    error_message = "The signing-keys and seed one-off task runs as the app role, with the environment of every Fargate task of the service stack."
  }

  assert {
    condition     = !strcontains(local.policies["one-off"]["database-connect"], "identity_owner") && strcontains(local.policies["one-off"]["database-connect"], "dbuser:prx-0123456789abcdef0/identity_app")
    error_message = "The one-off task never connects as the owner role."
  }

  assert {
    condition     = !contains(keys(local.policies["one-off"]), "messaging") && !contains(keys(local.policies["migrate"]), "messaging")
    error_message = "The one-off and migrate tasks publish and consume nothing."
  }
}

# Applied with the mocked provider, so the role, log group and security group identifiers are known.
run "migrate_task_has_its_own_role_and_connects_as_the_owner" {
  command = apply

  variables {
    api     = { runtime = "fargate" }
    workers = { commands = { queue = "identity-commands" } }
  }

  assert {
    condition = (
      output.migrate_task.task_role_arn == module.component["migrate"].role_arn &&
      output.migrate_task.task_role_arn != output.one_off_task.task_role_arn &&
      output.migrate_task.execution_role_arn == module.component["migrate"].execution_role_arn &&
      output.migrate_task.log_group_name == "/ecs/nt-dev/identity-migrate" &&
      output.migrate_task.security_group_ids == [module.component["migrate"].security_group_id, "sg-0clients"] &&
      output.migrate_task.cluster_arn == output.one_off_task.cluster_arn &&
      output.migrate_task.subnet_ids == output.one_off_task.subnet_ids
    )
    error_message = "The migrate task runs where the one-off task runs, with its own task and execution roles, log group and security group (ADR 0041)."
  }

  assert {
    condition = (
      output.migrate_task.environment["DB_USER"] == "identity_owner" &&
      merge(output.migrate_task.environment, {
        DB_USER        = "identity_app"
        DB_READER_USER = "identity_reader"
        DB_INSTANCES   = output.fargate_environment["DB_INSTANCES"]
      }) == output.fargate_environment
    )
    error_message = "Apart from the owner role and the primary-only instances, the migrate task gets the environment of every Fargate task of the service stack."
  }

  assert {
    condition = (
      !contains(keys(output.migrate_task.environment), "DB_READER_USER") &&
      jsondecode(output.migrate_task.environment["DB_INSTANCES"]) == {
        main = {
          primary  = { host = "nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com", port = 5432 }
          replicas = []
        }
      }
    )
    error_message = "The migrate task reaches only the primary through RDS Proxy: its owner role has no connect right on the replicas, so it neither reads them nor opens a pool to them."
  }

  assert {
    condition = (
      strcontains(local.policies["migrate"]["database-connect"], "dbuser:prx-0123456789abcdef0/identity_owner") &&
      !strcontains(local.policies["migrate"]["database-connect"], "identity_app") &&
      !strcontains(local.policies["migrate"]["database-connect"], "identity_reader")
    )
    error_message = "The migrate task connects as the owner role only."
  }

  assert {
    condition     = length([for key, p in local.policies : key if strcontains(try(p["database-connect"], ""), "identity_owner")]) == 1
    error_message = "Only the migrate task connects as the owner role."
  }
}

run "one_off_task_carries_the_region_of_the_stack_and_no_move_targets" {
  command = apply

  variables {
    region = "eu-west-1"
    regions = {
      us = { aws_region = "us-east-1", api_base_url = "https://api.example.test", issuer = "https://api.example.test" }
      eu = { aws_region = "eu-west-1", api_base_url = "https://eu.api.example.test", issuer = "https://eu.api.example.test" }
    }
    api = { runtime = "fargate" }
  }

  assert {
    condition = jsondecode(output.one_off_task.environment["REGIONS"]) == [
      { code = "eu", apiBaseUrl = "https://eu.api.example.test", issuer = "https://eu.api.example.test" },
      { code = "us", apiBaseUrl = "https://api.example.test", issuer = "https://api.example.test" },
    ]
    error_message = "REGIONS lists every region of common.tfvars with the code, apiBaseUrl and issuer the code reads."
  }

  assert {
    condition     = output.one_off_task.environment["SERVICE_REGION"] == "eu" && output.one_off_task.environment["IDENTITY_REGION"] == "eu"
    error_message = "SERVICE_REGION, and IDENTITY_REGION for identity, are the code of the stack region."
  }

  assert {
    condition     = output.one_off_task.environment["AUTH_ISSUER"] == "https://eu.api.example.test" && output.one_off_task.environment["IDENTITY_ISSUER"] == "https://eu.api.example.test"
    error_message = "AUTH_ISSUER, and IDENTITY_ISSUER for identity, are the issuer of the stack region, as the regions and identity schemas require."
  }

  assert {
    condition     = output.one_off_task.environment["TENANT_MOVE_STRATEGY"] == "batch"
    error_message = "Tenant moves copy in batches."
  }

  assert {
    condition     = !contains(keys(output.one_off_task.environment), "TENANT_MOVE_TARGETS") && !contains(keys(output.lambda_environment), "TENANT_MOVE_TARGETS")
    error_message = "TENANT_MOVE_TARGETS stays unset, so each shard's group follows the naming convention."
  }
}

run "only_identity_receives_identity_region" {
  command = plan

  variables {
    service_name    = "tasks"
    database_access = false
    api             = { runtime = "lambda" }
  }

  assert {
    condition     = !contains(keys(local.lambda_environment), "IDENTITY_REGION") && !contains(keys(local.lambda_environment), "IDENTITY_ISSUER") && local.lambda_environment["SERVICE_REGION"] == "us" && local.lambda_environment["AUTH_ISSUER"] == "https://api.example.test"
    error_message = "Every service gets SERVICE_REGION and AUTH_ISSUER; only identity gets IDENTITY_REGION and IDENTITY_ISSUER."
  }
}

run "a_stack_region_outside_regions_is_rejected" {
  command = plan

  variables {
    region = "eu-west-1"
    api    = { runtime = "lambda" }
  }

  expect_failures = [terraform_data.service_check]
}

run "tenant_move_targets_cannot_be_set" {
  command = plan

  variables {
    environment_variables = { TENANT_MOVE_TARGETS = "{}" }
  }

  expect_failures = [var.environment_variables]
}
