# Pruebas del stack de servicio con proveedores simulados: no tocan AWS ni el backend.
# Ejecuta: terraform init -backend=false && terraform test

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
      queue_arns  = { "identity-commands" = "arn:aws:sqs:us-east-1:123456789012:nt-dev-identity-commands" }
      queue_urls  = { "identity-commands" = "https://sqs.us-east-1.amazonaws.com/123456789012/nt-dev-identity-commands" }
      queue_names = { "identity-commands" = "nt-dev-identity-commands" }
      service_access = {
        identity = { publish_topics = ["identity-events"], send_queues = [], consume_queues = ["identity-commands"] }
      }
    }
  }
}

run "lambda_api_with_consumer" {
  command = plan

  variables {
    api = { runtime = "lambda", route_prefixes = ["/identity"] }
    consumers = {
      commands = { queue = "identity-commands", handler = "lambda.sqsHandler" }
    }
  }

  assert {
    condition     = length(module.api_lambda) == 1 && length(module.api_fargate) == 0
    error_message = "La API en Lambda no crea servicio ECS."
  }

  assert {
    condition     = toset(module.api_routes[0].route_keys) == toset(["ANY /identity", "ANY /identity/{proxy+}"])
    error_message = "Cada prefijo crea su raíz y su proxy."
  }

  assert {
    condition     = jsondecode(local.lambda_env["DB_DATABASES"]).shards[1] == "identity_shard_1"
    error_message = "El servicio recibe el mapa de sus bases."
  }

  assert {
    condition     = strcontains(local.policies["messaging"], "nt-dev-identity-events") && strcontains(local.policies["messaging"], "nt-dev-identity-commands")
    error_message = "El IAM sale de producers y consumer de la topología."
  }

  assert {
    condition     = local.base_environment["VALKEY_KEY_PREFIX"] == "identity"
    error_message = "La caché antepone el nombre del servicio."
  }
}

run "fargate_api_with_realtime_and_worker" {
  command = plan

  variables {
    api      = { runtime = "fargate", route_prefixes = ["/identity"], listener_rule_priority = 100 }
    realtime = { listener_rule_priority = 200, path_patterns = ["/identity/socket.io/*"] }
    workers  = { commands = { queue = "identity-commands" } }
  }

  assert {
    condition     = length(module.api_lambda) == 0 && length(module.api_fargate) == 1 && length(module.realtime) == 1
    error_message = "La API en Fargate y el tiempo real crean servicios ECS."
  }

  assert {
    condition     = tolist(local.api_path_patterns) == tolist(["/identity", "/identity/*"])
    error_message = "El ALB interno enruta los mismos prefijos que la API."
  }

  assert {
    condition     = local.fargate_secrets["DB_CREDENTIALS"] == "arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/db/identity-AbCdEf"
    error_message = "Fargate recibe las credenciales por valueFrom."
  }
}

run "fargate_api_needs_priority" {
  command = plan

  variables {
    api = { runtime = "fargate", route_prefixes = ["/identity"] }
  }

  expect_failures = [var.api]
}
