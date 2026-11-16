# Un microservicio con estado propio. Elige el runtime de su API (Lambda o Fargate), y
# opcionalmente tiempo real (Fargate tras el ALB público), workers Fargate y consumidores
# Lambda. Lee red, plataforma, datos y mensajería de sus stacks; no los modifica, salvo las
# rutas que agrega a la API compartida y las reglas de sus listeners.

data "aws_caller_identity" "current" {}

locals {
  svc  = var.service_name
  name = replace(var.service_name, "_", "-")

  api_lambda  = var.api != null && try(var.api.runtime, "") == "lambda"
  api_fargate = var.api != null && try(var.api.runtime, "") == "fargate"
  uses_lambda = local.api_lambda || length(var.consumers) > 0
  uses_ecs    = local.api_fargate || var.realtime != null || length(var.workers) > 0

  # Tópicos y colas según producers y consumer de la topología exportada.
  access = try(local.messaging.service_access[local.svc], {
    publish_topics = []
    send_queues    = []
    consume_queues = []
  })
  component_queues = concat([for w in values(var.workers) : w.queue], [for c in values(var.consumers) : c.queue])

  databases     = try(local.data.service_databases[local.svc], null)
  db_secret_arn = var.database_access ? try(local.data.db_service_secret_arns[local.svc], null) : null
  valkey_user   = var.valkey_access ? try(local.data.valkey.user_names[local.svc], null) : null
  observability = local.platform.observability

  # Contrato con los adaptadores de @platform: los nombres de estas variables son los que
  # validan sus esquemas de configuración. Las variables propias del servicio van primero,
  # así no pueden pisar el contrato.
  common_environment = merge(
    var.environment_variables,
    {
      SERVICE_NAME          = local.svc
      DEPLOY_ENVIRONMENT    = var.environment
      MESSAGING_NAME_PREFIX = local.messaging.name_prefix
      # El adaptador de AWS arma los ARN de los tópicos sin llamar a STS.
      AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
    },
    var.database_access ? {
      DB_PROXY_HOST   = local.data.db.proxy_endpoint
      DB_READER_HOSTS = join(",", local.data.db.reader_endpoints)
      DB_PORT         = tostring(local.data.db.port)
      DB_DATABASES    = jsonencode(local.databases)
    } : {},
    # Valkey serverless exige TLS y autenticación IAM: el cliente firma un token con su rol
    # para VALKEY_CACHE_NAME y entra como VALKEY_USER. La ACL limita llaves y canales a
    # VALKEY_KEY_PREFIX.
    local.valkey_user == null ? {} : {
      VALKEY_HOST       = local.data.valkey.endpoint
      VALKEY_PORT       = tostring(local.data.valkey.port)
      VALKEY_TLS        = "true"
      VALKEY_USER       = local.valkey_user
      VALKEY_AUTH       = "iam-serverless"
      VALKEY_CACHE_NAME = local.data.valkey.cache_name
      VALKEY_KEY_PREFIX = local.svc
    },
  )

  # Lambda define AWS_REGION por su cuenta (es una variable reservada); Fargate no la
  # garantiza en todas las versiones de plataforma.
  fargate_environment = merge(local.common_environment, { AWS_REGION = var.region })
  lambda_environment  = merge(local.common_environment, local.db_secret_arn == null ? {} : { DB_SECRET_ARN = local.db_secret_arn })

  # --- IAM por componente ---------------------------------------------------------
  # Cada componente recibe solo lo que usa: la API y el tiempo real no consumen colas, cada
  # worker consume solo la suya y archivos y SES se piden por componente. Las Lambdas
  # consumidoras reciben el permiso de su cola del módulo service-lambda.
  components = merge(
    var.api == null ? {} : {
      api = { publish = true, queue = null, files = var.api.files_access, ses = var.api.ses_send }
    },
    var.realtime == null ? {} : {
      realtime = { publish = var.realtime.publish, queue = null, files = var.realtime.files_access, ses = var.realtime.ses_send }
    },
    { for k, w in var.workers : "worker-${k}" => { publish = true, queue = w.queue, files = w.files_access, ses = w.ses_send } },
    { for k, c in var.consumers : "consumer-${k}" => { publish = true, queue = null, files = c.files_access, ses = c.ses_send } },
  )

  publish_statements = concat(
    length(local.access.publish_topics) == 0 ? [] : [{
      Sid      = "PublishTopics"
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = [for t in local.access.publish_topics : local.messaging.topic_arns[t]]
    }],
    length(local.access.send_queues) == 0 ? [] : [{
      Sid      = "SendQueues"
      Effect   = "Allow"
      Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
      Resource = [for q in local.access.send_queues : local.messaging.queue_arns[q]]
    }],
  )

  messaging_statements = {
    for name, c in local.components : name => concat(
      c.publish ? local.publish_statements : [],
      c.queue == null ? [] : [{
        Sid      = "ConsumeQueue"
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"]
        Resource = [try(local.messaging.queue_arns[c.queue], "")]
      }],
    )
  }

  policies = {
    for name, c in local.components : name => merge(
      length(local.messaging_statements[name]) == 0 ? {} : {
        messaging = jsonencode({
          Version = "2012-10-17"
          Statement = concat(local.messaging_statements[name], [{
            Sid      = "MessagingKey"
            Effect   = "Allow"
            Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
            Resource = local.messaging.kms_key_arn
          }])
        })
      },
      local.valkey_user == null ? {} : {
        valkey-connect = jsonencode({
          Version = "2012-10-17"
          Statement = [{
            Effect   = "Allow"
            Action   = ["elasticache:Connect"]
            Resource = local.data.valkey.connect_resource_arns[local.svc]
          }]
        })
      },
      c.files ? { files = try(local.platform.files_bucket.read_write_policy_json, "") } : {},
      c.ses ? { ses-send = try(local.platform.ses.send_policy_json, "") } : {},
      var.task_policies,
    )
  }

  component_environment = {
    for name, c in local.components : name => c.files ? { FILES_BUCKET = try(local.platform.files_bucket.name, "") } : {}
  }

  secret_kms_keys = distinct(concat(
    var.secrets_kms_key_arns,
    local.db_secret_arn == null ? [] : [local.data.db.kms_key_arn],
    local.observability == null ? [] : [local.observability.kms_key_arn],
  ))

  # Fargate recibe el secreto por valueFrom; Lambda recibe el ARN y lo lee al arrancar.
  fargate_secrets = merge(var.secrets, local.db_secret_arn == null ? {} : { DB_CREDENTIALS = local.db_secret_arn })
  lambda_secrets  = distinct(concat([for v in values(var.secrets) : regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v)], local.db_secret_arn == null ? [] : [local.db_secret_arn]))

  # Una CMK de logs por ambiente para todo el cómputo (stack platform).
  logs_kms_key_arn = local.platform.compute_logs_kms_key_arn

  data_security_groups = [local.data.clients_security_group_id]

  api_path_patterns = local.api_fargate ? flatten([for p in var.api.route_prefixes : [p, "${p}/*"]]) : []
}

# Referencias a otros stacks que la validación de variables no alcanza a comprobar.
resource "terraform_data" "service_check" {
  input = local.svc

  lifecycle {
    precondition {
      condition     = !local.uses_ecs || var.image != null
      error_message = "La API en Fargate, el tiempo real y los workers necesitan image."
    }
    precondition {
      condition     = !local.uses_lambda || var.lambda_package != null
      error_message = "La API en Lambda y los consumidores necesitan lambda_package."
    }
    precondition {
      condition     = !local.api_fargate || local.platform.api_alb != null
      error_message = "Una API en Fargate necesita fargate_api_enabled = true en el stack platform."
    }
    precondition {
      condition     = var.realtime == null || local.platform.realtime_alb != null
      error_message = "realtime necesita realtime_alb_certificate_arn en el stack platform."
    }
    precondition {
      condition     = !var.database_access || (local.databases != null && local.db_secret_arn != null)
      error_message = "database_access necesita el servicio en db_services del stack data."
    }
    precondition {
      condition     = !var.valkey_access || local.valkey_user != null
      error_message = "valkey_access necesita el servicio en valkey_services del stack data."
    }
    precondition {
      condition     = alltrue([for q in local.component_queues : contains(keys(local.messaging.queue_arns), q)])
      error_message = "Un worker o consumidor usa una cola que no está en la topología ni es ses-events."
    }
    precondition {
      condition     = !anytrue([for c in values(local.components) : c.files]) || local.platform.files_bucket != null
      error_message = "files_access necesita el bucket de archivos (files_cors_allowed_origins en platform)."
    }
    precondition {
      condition     = !anytrue([for c in values(local.components) : c.ses]) || local.platform.ses != null
      error_message = "ses_send necesita ses_domain en el stack platform."
    }
  }
}

# --- API ------------------------------------------------------------------------

module "api_lambda" {
  count  = local.api_lambda ? 1 : 0
  source = "../../modules/service-lambda"

  name_prefix   = var.name_prefix
  function_name = "${local.name}-api"
  description   = "API de ${local.svc}"
  environment   = var.environment

  handler                        = var.api.handler
  runtime                        = var.lambda_runtime
  memory_size                    = var.api.memory_size
  timeout                        = var.api.timeout
  reserved_concurrent_executions = var.api.reserved_concurrent_executions
  filename                       = try(var.lambda_package.filename, null)
  s3_bucket                      = try(var.lambda_package.s3_bucket, null)
  s3_key                         = try(var.lambda_package.s3_key, null)
  s3_object_version              = try(var.lambda_package.s3_object_version, null)
  source_code_hash               = try(var.lambda_package.source_code_hash, null)

  environment_variables = merge(local.lambda_environment, local.component_environment["api"])
  secret_arns           = local.lambda_secrets
  secrets_kms_key_arns  = local.secret_kms_keys
  task_policies         = local.policies["api"]
  otel_layer_arn        = var.lambda_otel_layer_arn
  kms_key_arn           = local.logs_kms_key_arn
  log_retention_days    = var.log_retention_days

  vpc_enabled                   = true
  vpc_id                        = local.network.vpc_id
  subnet_ids                    = local.network.private_subnet_ids
  additional_security_group_ids = local.data_security_groups

  alarm_topic_arn = local.platform.alarm_topic_arn

  depends_on = [terraform_data.service_check]
}

module "api_fargate" {
  count  = local.api_fargate ? 1 : 0
  source = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = "${local.name}-api"
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  additional_security_group_ids = local.data_security_groups

  image          = var.image
  command        = var.api.command
  container_port = var.api.container_port
  cpu            = var.api.cpu
  memory         = var.api.memory
  desired_count  = var.api.desired_count
  min_capacity   = var.api.min_capacity
  max_capacity   = var.api.max_capacity

  capacity_provider_strategy = [{ capacity_provider = var.api.spot ? "FARGATE_SPOT" : "FARGATE", weight = 1, base = 0 }]

  environment_variables = merge(local.fargate_environment, local.component_environment["api"])
  secrets               = local.fargate_secrets
  secrets_kms_key_arns  = local.secret_kms_keys
  task_policies         = local.policies["api"]

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  enable_load_balancer   = true
  alb_listener_arn       = local.platform.api_alb.listener_arn
  alb_security_group_id  = local.platform.api_alb.security_group_id
  listener_rule_priority = var.api.listener_rule_priority
  path_patterns          = local.api_path_patterns
  health_check_path      = var.api.health_check_path
  cpu_target_percent     = var.api.cpu_target_percent

  enable_execute_command = var.enable_execute_command
  exec_kms_key_arn       = var.enable_execute_command ? local.platform.ecs_cluster.kms_key_arn : null
  kms_key_arn            = local.logs_kms_key_arn
  log_retention_days     = var.log_retention_days

  depends_on = [terraform_data.service_check]
}

# Rutas en la API compartida. Cambiar de runtime solo cambia el destino.
module "api_routes" {
  count  = var.api == null ? 0 : 1
  source = "../../modules/api-routes"

  name              = local.svc
  api_id            = local.platform.http_api.id
  api_execution_arn = local.platform.http_api.execution_arn
  authorizer_id     = local.platform.http_api.authorizer_id
  route_prefixes    = var.api.route_prefixes

  target = local.api_lambda ? {
    type                 = "lambda"
    lambda_function_name = module.api_lambda[0].function_name
    lambda_invoke_arn    = module.api_lambda[0].invoke_arn
    } : {
    type         = "vpc_link"
    vpc_link_id  = local.platform.http_api.vpc_link_id
    listener_arn = local.platform.api_alb.listener_arn
  }

  depends_on = [module.api_fargate]
}

# --- Tiempo real ------------------------------------------------------------------

module "realtime" {
  count  = var.realtime == null ? 0 : 1
  source = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = "${local.name}-rt"
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  additional_security_group_ids = local.data_security_groups

  image          = var.image
  command        = var.realtime.command
  container_port = var.realtime.container_port
  cpu            = var.realtime.cpu
  memory         = var.realtime.memory
  desired_count  = var.realtime.desired_count
  min_capacity   = var.realtime.min_capacity
  max_capacity   = var.realtime.max_capacity

  environment_variables = merge(local.fargate_environment, local.component_environment["realtime"])
  secrets               = local.fargate_secrets
  secrets_kms_key_arns  = local.secret_kms_keys
  task_policies         = local.policies["realtime"]

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  enable_load_balancer   = true
  alb_listener_arn       = local.platform.realtime_alb.listener_arn
  alb_security_group_id  = local.platform.realtime_alb.security_group_id
  listener_rule_priority = var.realtime.listener_rule_priority
  path_patterns          = var.realtime.path_patterns
  host_headers           = var.realtime.host_headers
  health_check_path      = var.realtime.health_check_path
  cpu_target_percent     = var.realtime.cpu_target_percent

  enable_execute_command = var.enable_execute_command
  exec_kms_key_arn       = var.enable_execute_command ? local.platform.ecs_cluster.kms_key_arn : null
  kms_key_arn            = local.logs_kms_key_arn
  log_retention_days     = var.log_retention_days

  depends_on = [terraform_data.service_check]
}

# --- Workers y consumidores ---------------------------------------------------------

module "worker" {
  for_each = var.workers
  source   = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = "${local.name}-${replace(each.key, "_", "-")}"
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  additional_security_group_ids = local.data_security_groups

  image         = var.image
  command       = each.value.command
  cpu           = each.value.cpu
  memory        = each.value.memory
  desired_count = each.value.min_capacity
  min_capacity  = each.value.min_capacity
  max_capacity  = each.value.max_capacity

  capacity_provider_strategy = [{ capacity_provider = each.value.spot ? "FARGATE_SPOT" : "FARGATE", weight = 1, base = 0 }]

  environment_variables = merge(local.fargate_environment, local.component_environment["worker-${each.key}"], { QUEUE_URL = local.messaging.queue_urls[each.value.queue] })
  secrets               = local.fargate_secrets
  secrets_kms_key_arns  = local.secret_kms_keys
  task_policies         = local.policies["worker-${each.key}"]

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  cpu_target_percent = null
  sqs_scaling = {
    queue_name          = local.messaging.queue_names[each.value.queue]
    scale_out_threshold = each.value.scale_out_threshold
    messages_per_task   = each.value.messages_per_task
    steps               = each.value.steps
    scale_in_periods    = each.value.scale_in_periods
  }

  enable_execute_command = var.enable_execute_command
  exec_kms_key_arn       = var.enable_execute_command ? local.platform.ecs_cluster.kms_key_arn : null
  kms_key_arn            = local.logs_kms_key_arn
  log_retention_days     = var.log_retention_days

  depends_on = [terraform_data.service_check]
}

module "consumer" {
  for_each = var.consumers
  source   = "../../modules/service-lambda"

  name_prefix   = var.name_prefix
  function_name = "${local.name}-${replace(each.key, "_", "-")}"
  description   = "Consumidor ${each.key} de ${local.svc}"
  environment   = var.environment

  handler           = each.value.handler
  runtime           = var.lambda_runtime
  memory_size       = each.value.memory_size
  timeout           = each.value.timeout
  filename          = try(var.lambda_package.filename, null)
  s3_bucket         = try(var.lambda_package.s3_bucket, null)
  s3_key            = try(var.lambda_package.s3_key, null)
  s3_object_version = try(var.lambda_package.s3_object_version, null)
  source_code_hash  = try(var.lambda_package.source_code_hash, null)

  environment_variables = merge(local.lambda_environment, local.component_environment["consumer-${each.key}"])
  secret_arns           = local.lambda_secrets
  secrets_kms_key_arns  = local.secret_kms_keys
  task_policies         = local.policies["consumer-${each.key}"]
  otel_layer_arn        = var.lambda_otel_layer_arn
  kms_key_arn           = local.logs_kms_key_arn
  log_retention_days    = var.log_retention_days

  vpc_enabled                   = true
  vpc_id                        = local.network.vpc_id
  subnet_ids                    = local.network.private_subnet_ids
  additional_security_group_ids = local.data_security_groups

  queue_arn                       = local.messaging.queue_arns[each.value.queue]
  queue_kms_key_arn               = local.messaging.kms_key_arn
  batch_size                      = each.value.batch_size
  maximum_batching_window_seconds = each.value.maximum_batching_window_seconds
  maximum_concurrency             = each.value.maximum_concurrency
  filter_patterns                 = each.value.filter_patterns

  alarm_topic_arn = local.platform.alarm_topic_arn

  depends_on = [terraform_data.service_check]
}
