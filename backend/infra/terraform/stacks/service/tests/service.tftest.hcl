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
    condition     = jsondecode(local.lambda_environment["DB_DATABASES"]).shards[1] == "identity_shard_1"
    error_message = "El servicio recibe el mapa de sus bases."
  }

  # Contrato con los esquemas de configuración de los adaptadores: cambiar un nombre aquí
  # obliga a cambiarlo también en backend/libs y en backend/.env.example.
  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["api"]))) == sort(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DB_SECRET_ARN", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"])
    error_message = "La API en Lambda recibe exactamente las variables del contrato con los adaptadores."
  }

  assert {
    condition     = sort(keys(merge(local.lambda_environment, local.component_environment["consumer-commands"]))) == sort(["AWS_ACCOUNT_ID", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DB_SECRET_ARN", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"])
    error_message = "Un consumidor Lambda recibe las mismas variables que la API en Lambda."
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
    error_message = "Valkey se usa con TLS, token IAM de la caché serverless y el prefijo del servicio, que es el de su ACL."
  }

  assert {
    condition     = strcontains(local.policies["api"]["messaging"], "nt-dev-identity-events") && !strcontains(local.policies["api"]["messaging"], "sqs:ReceiveMessage")
    error_message = "La API publica según producers y no consume colas."
  }

  assert {
    condition     = !strcontains(local.policies["consumer-commands"]["messaging"], "sqs:ReceiveMessage")
    error_message = "El consumidor Lambda recibe el permiso de su cola del módulo, no de la política del servicio."
  }

  assert {
    condition     = module.api_lambda[0].kms_key_arn == "arn:aws:kms:us-east-1:123456789012:key/compute-logs"
    error_message = "Las Lambdas usan la CMK de logs del ambiente en lugar de crear una propia."
  }
}

run "fargate_api_with_realtime_and_worker" {
  command = plan

  variables {
    api      = { runtime = "fargate", route_prefixes = ["/identity"], listener_rule_priority = 100 }
    realtime = { listener_rule_priority = 200, path_patterns = ["/identity/socket.io/*"] }
    workers = {
      commands = { queue = "identity-commands" }
      reports  = { queue = "identity-reports" }
    }
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

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["api"]))) == sort(["AWS_ACCOUNT_ID", "AWS_REGION", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"])
    error_message = "La API en Fargate recibe exactamente las variables del contrato con los adaptadores."
  }

  assert {
    condition     = sort(keys(merge(local.fargate_environment, local.component_environment["worker-commands"], { QUEUE_URL = "" }))) == sort(concat(["AWS_ACCOUNT_ID", "AWS_REGION", "DB_DATABASES", "DB_PORT", "DB_PROXY_HOST", "DB_READER_HOSTS", "DEPLOY_ENVIRONMENT", "MESSAGING_NAME_PREFIX", "SERVICE_NAME", "VALKEY_AUTH", "VALKEY_CACHE_NAME", "VALKEY_HOST", "VALKEY_KEY_PREFIX", "VALKEY_PORT", "VALKEY_TLS", "VALKEY_USER"], ["QUEUE_URL"]))
    error_message = "Un worker recibe las variables de Fargate y la URL de su cola."
  }

  assert {
    condition     = local.fargate_environment["AWS_REGION"] == "us-east-1"
    error_message = "Fargate recibe la región."
  }

  assert {
    condition     = !contains(keys(local.policies["realtime"]), "messaging") && !contains(keys(local.policies["api"]), "files")
    error_message = "El tiempo real no publica ni consume por defecto, y nadie recibe archivos sin pedirlos."
  }

  assert {
    condition = (
      strcontains(local.policies["worker-commands"]["messaging"], "nt-dev-identity-commands") &&
      !strcontains(local.policies["worker-commands"]["messaging"], "nt-dev-identity-reports")
    )
    error_message = "Cada worker consume solo su cola."
  }
}

run "files_only_where_asked" {
  command = plan

  variables {
    api     = { runtime = "fargate", route_prefixes = ["/identity"], listener_rule_priority = 100, files_access = true }
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
    error_message = "Solo el componente que pide archivos recibe la política del bucket."
  }

  assert {
    condition     = local.component_environment["api"]["FILES_BUCKET"] == "nt-dev-files-123456789012" && length(local.component_environment["worker-commands"]) == 0
    error_message = "Solo el componente con archivos recibe FILES_BUCKET."
  }
}

run "files_need_bucket" {
  command = plan

  variables {
    api = { runtime = "lambda", route_prefixes = ["/identity"], files_access = true }
  }

  expect_failures = [terraform_data.service_check]
}

run "fargate_api_needs_priority" {
  command = plan

  variables {
    api = { runtime = "fargate", route_prefixes = ["/identity"] }
  }

  expect_failures = [var.api]
}
