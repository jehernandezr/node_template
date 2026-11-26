# Plans one service stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
# once per service of each environment with -var-file common.tfvars and -var-file the service's terraform.tfvars.
# The other stacks are mocked as fully applied: their outputs follow topology.json and hold every service, so a
# failure here comes from the service values or the service stack. The image and the Lambda package arrive as the
# pipeline passes them.

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
      alarm_topic_arn = "arn:aws:sns:us-east-1:123456789012:nt-env-alarms"
      ecs_cluster     = { arn = "arn:aws:ecs:us-east-1:123456789012:cluster/nt-env", name = "nt-env", kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/ecs" }
      observability   = null
      http_api = {
        id                       = "abc123"
        execution_arn            = "arn:aws:execute-api:us-east-1:123456789012:abc123"
        endpoint_host            = "abc123.execute-api.us-east-1.amazonaws.com"
        authorizer_id            = "auth01"
        origin_verify_secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env-api/origin-verify-AbCdEf"
        origin_verify_kms_arn    = "arn:aws:kms:us-east-1:123456789012:key/api"
        vpc_link_id              = "vl-0123"
      }
      api_alb      = { listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-env-api/1/2", security_group_id = "sg-0api" }
      realtime_alb = { listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/nt-env-rt/1/3", security_group_id = "sg-0rt", dns_name = "rt.example.test", zone_id = "Z1" }
      files_bucket = null
      ses          = { send_policy_json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }

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
        proxy_endpoint   = "nt-env-proxy.proxy-x.us-east-1.rds.amazonaws.com"
        reader_endpoints = ["nt-env-postgres-replica-1.x.us-east-1.rds.amazonaws.com"]
        port             = 5432
        kms_key_arn      = "arn:aws:kms:us-east-1:123456789012:key/rds"
      }
      db_service_secret_arns = {
        "billing"       = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env/db/billing-AbCdEf"
        "identity"      = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env/db/identity-AbCdEf"
        "notifications" = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env/db/notifications-AbCdEf"
        "reports"       = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env/db/reports-AbCdEf"
        "tasks"         = "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-env/db/tasks-AbCdEf"
      }
      service_databases = {
        "billing"       = { shards = ["billing_shard_0"], catalog = "catalog" }
        "identity"      = { shards = ["identity_shard_0"], catalog = "catalog" }
        "notifications" = { shards = ["notifications_shard_0"], catalog = "catalog" }
        "reports"       = { shards = ["reports_shard_0"], catalog = "catalog" }
        "tasks"         = { shards = ["tasks_shard_0"], catalog = "catalog" }
      }
      valkey = {
        endpoint   = "nt-env-valkey.serverless.use1.cache.amazonaws.com"
        cache_name = "nt-env-valkey"
        port       = 6379
        user_names = {
          "billing"       = "nt-env-billing"
          "identity"      = "nt-env-identity"
          "notifications" = "nt-env-notifications"
          "reports"       = "nt-env-reports"
          "tasks"         = "nt-env-tasks"
        }
        connect_resource_arns = {
          "billing"       = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-env-valkey"]
          "identity"      = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-env-valkey"]
          "notifications" = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-env-valkey"]
          "reports"       = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-env-valkey"]
          "tasks"         = ["arn:aws:elasticache:us-east-1:123456789012:serverlesscache:nt-env-valkey"]
        }
      }
    }
  }
}

override_data {
  target = data.terraform_remote_state.messaging
  values = {
    outputs = {
      name_prefix = "nt-env"
      kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/messaging"
      topic_arns = {
        "billing-events"       = "arn:aws:sns:us-east-1:123456789012:nt-env-billing-events"
        "identity-events"      = "arn:aws:sns:us-east-1:123456789012:nt-env-identity-events"
        "notifications-events" = "arn:aws:sns:us-east-1:123456789012:nt-env-notifications-events"
        "reports-events"       = "arn:aws:sns:us-east-1:123456789012:nt-env-reports-events"
        "tasks-events"         = "arn:aws:sns:us-east-1:123456789012:nt-env-tasks-events"
      }
      queue_arns = {
        "billing-identity"               = "arn:aws:sqs:us-east-1:123456789012:nt-env-billing-identity"
        "billing-usage"                  = "arn:aws:sqs:us-east-1:123456789012:nt-env-billing-usage.fifo"
        "identity-access-projection"     = "arn:aws:sqs:us-east-1:123456789012:nt-env-identity-access-projection"
        "identity-auth-state"            = "arn:aws:sqs:us-east-1:123456789012:nt-env-identity-auth-state"
        "identity-billing"               = "arn:aws:sqs:us-east-1:123456789012:nt-env-identity-billing"
        "identity-password-resets"       = "arn:aws:sqs:us-east-1:123456789012:nt-env-identity-password-resets"
        "notifications-realtime-control" = "arn:aws:sqs:us-east-1:123456789012:nt-env-notifications-realtime-control"
        "notifications-triggers"         = "arn:aws:sqs:us-east-1:123456789012:nt-env-notifications-triggers"
        "reports-finance-projections"    = "arn:aws:sqs:us-east-1:123456789012:nt-env-reports-finance-projections"
        "reports-projections"            = "arn:aws:sqs:us-east-1:123456789012:nt-env-reports-projections"
        "reports-runs"                   = "arn:aws:sqs:us-east-1:123456789012:nt-env-reports-runs"
        "ses-events"                     = "arn:aws:sqs:us-east-1:123456789012:nt-env-ses-events"
      }
      queue_urls = {
        "billing-identity"               = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-billing-identity"
        "billing-usage"                  = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-billing-usage.fifo"
        "identity-access-projection"     = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-identity-access-projection"
        "identity-auth-state"            = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-identity-auth-state"
        "identity-billing"               = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-identity-billing"
        "identity-password-resets"       = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-identity-password-resets"
        "notifications-realtime-control" = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-notifications-realtime-control"
        "notifications-triggers"         = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-notifications-triggers"
        "reports-finance-projections"    = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-reports-finance-projections"
        "reports-projections"            = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-reports-projections"
        "reports-runs"                   = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-reports-runs"
        "ses-events"                     = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-env-ses-events"
      }
      queue_names = {
        "billing-identity"               = "nt-env-billing-identity"
        "billing-usage"                  = "nt-env-billing-usage.fifo"
        "identity-access-projection"     = "nt-env-identity-access-projection"
        "identity-auth-state"            = "nt-env-identity-auth-state"
        "identity-billing"               = "nt-env-identity-billing"
        "identity-password-resets"       = "nt-env-identity-password-resets"
        "notifications-realtime-control" = "nt-env-notifications-realtime-control"
        "notifications-triggers"         = "nt-env-notifications-triggers"
        "reports-finance-projections"    = "nt-env-reports-finance-projections"
        "reports-projections"            = "nt-env-reports-projections"
        "reports-runs"                   = "nt-env-reports-runs"
        "ses-events"                     = "nt-env-ses-events"
      }
      service_access = {
        "billing"       = { publish_topics = ["billing-events"], send_queues = [], consume_queues = ["billing-identity", "billing-usage"] }
        "identity"      = { publish_topics = ["identity-events"], send_queues = ["billing-usage", "identity-password-resets"], consume_queues = ["identity-access-projection", "identity-auth-state", "identity-billing", "identity-password-resets"] }
        "notifications" = { publish_topics = ["notifications-events"], send_queues = ["billing-usage"], consume_queues = ["notifications-realtime-control", "notifications-triggers"] }
        "reports"       = { publish_topics = ["reports-events"], send_queues = ["billing-usage", "reports-runs"], consume_queues = ["reports-finance-projections", "reports-projections", "reports-runs"] }
        "tasks"         = { publish_topics = ["tasks-events"], send_queues = ["billing-usage"], consume_queues = [] }
      }
    }
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
    error_message = "The service is in the catalog of its environment and no two services share a listener priority."
  }

  assert {
    condition     = alltrue([for component in concat(module.api_fargate, module.realtime) : can(regex("^[a-z0-9][a-z0-9-]{0,4}-$", component.target_group_name_prefix))])
    error_message = "Every target group takes a valid prefix of at most 6 characters, whatever the length of name_prefix (B18)."
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
