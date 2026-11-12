# Microservicios declarados en var.services. Una entrada nueva en el mapa crea el servicio.

locals {
  ses_queue_arns = var.ses_domain == null ? {} : { "ses-events" = aws_sqs_queue.ses_events[0].arn }
  ses_queue_urls = var.ses_domain == null ? {} : { "ses-events" = aws_sqs_queue.ses_events[0].url }
  all_queue_arns = merge(module.messaging.queue_arns, local.ses_queue_arns)
  all_queue_urls = merge(module.messaging.queue_urls, local.ses_queue_urls)

  fargate_services = { for k, s in var.services : k => s if s.kind == "fargate" }
  lambda_services  = { for k, s in var.services : k => s if s.kind == "lambda" }

  # Servicios Fargate con tráfico entrante por el ALB.
  lb_services     = { for k, s in local.fargate_services : k => s if length(s.path_patterns) > 0 || length(s.host_headers) > 0 }
  lb_service_keys = sort(keys(local.lb_services))
  listener_priority = {
    for i, k in local.lb_service_keys : k => coalesce(local.lb_services[k].listener_rule_priority, 100 + 10 * i)
  }
  # Servicios cuyo tráfico debe venir de CloudFront (encabezado X-Origin-Verify).
  verified_services = !local.cloudfront_api_enabled ? {} : { for k, s in local.lb_services : k => s if s.origin_verify }

  obs_endpoint = try(module.observability[0].otlp_http_endpoint, null)
  obs_auth     = try(module.observability[0].otlp_authorization_value_from, null)
  obs_kms_keys = try([module.observability[0].kms_key_arn], [])

  # Variables de entorno comunes: hosts de datos y recursos asignados al servicio.
  service_env = {
    for k, s in var.services : k => merge(
      {
        DB_PROXY_HOST  = module.rds.proxy_endpoint
        DB_READER_HOST = coalesce(module.rds.reader_endpoint, module.rds.proxy_endpoint)
        DB_PORT        = "5432"
        DB_NAME        = var.db_name
        VALKEY_HOST    = module.valkey.endpoint
        VALKEY_PORT    = tostring(module.valkey.port)
      },
      s.valkey_user == null ? {} : { VALKEY_USER = module.valkey.iam_user_names[s.valkey_user] },
      s.files_access ? { FILES_BUCKET = module.files_bucket[0].bucket_id } : {},
      s.queue == null ? {} : { QUEUE_URL = local.all_queue_urls[s.queue] },
      s.environment_variables,
    )
  }

  # Políticas IAM en línea del rol de cada servicio.
  service_policies = {
    for k, s in var.services : k => merge(
      s.kind == "fargate" && s.queue != null ? {
        queue-consume = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect   = "Allow"
              Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"]
              Resource = local.all_queue_arns[s.queue]
            },
            {
              Effect   = "Allow"
              Action   = ["kms:Decrypt"]
              Resource = module.messaging.kms_key_arn
            },
          ]
        })
      } : {},
      length(s.send_queues) > 0 ? {
        queue-send = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect   = "Allow"
              Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
              Resource = [for q in s.send_queues : local.all_queue_arns[q]]
            },
            {
              Effect   = "Allow"
              Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
              Resource = module.messaging.kms_key_arn
            },
          ]
        })
      } : {},
      length(s.publish_topics) > 0 ? {
        topic-publish = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect   = "Allow"
              Action   = ["sns:Publish"]
              Resource = [for t in s.publish_topics : module.messaging.topic_arns[t]]
            },
            {
              Effect   = "Allow"
              Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
              Resource = module.messaging.kms_key_arn
            },
          ]
        })
      } : {},
      s.valkey_user == null ? {} : {
        valkey-connect = jsonencode({
          Version = "2012-10-17"
          Statement = [{
            Effect   = "Allow"
            Action   = ["elasticache:Connect"]
            Resource = module.valkey.connect_resource_arns[s.valkey_user]
          }]
        })
      },
      s.files_access ? { files = module.files_bucket[0].read_write_policy_json } : {},
      s.ses_send ? { ses-send = module.ses[0].send_policy_json } : {},
      s.task_policies,
    )
  }

  # Secretos: los declarados más el de base de datos del usuario del servicio.
  service_secrets = {
    for k, s in var.services : k => merge(
      s.secrets,
      s.db_user == null ? {} : { DB_CREDENTIALS = module.rds.service_secret_arns[s.db_user] },
    )
  }
  service_secret_kms_keys = {
    for k, s in var.services : k => distinct(concat(
      s.secrets_kms_key_arns,
      local.obs_kms_keys,
      s.db_user == null ? [] : [module.rds.kms_key_arn],
    ))
  }

  # Servicios en la VPC que deben llegar a RDS Proxy y Valkey.
  vpc_service_sg_ids = merge(
    { for k in keys(local.fargate_services) : k => module.service_fargate[k].security_group_id },
    { for k, s in local.lambda_services : k => module.service_lambda[k].security_group_id if s.vpc_enabled },
  )
}

# Referencias cruzadas que la validación de variables no alcanza a comprobar.
resource "terraform_data" "services_check" {
  lifecycle {
    precondition {
      condition     = length(local.lb_services) == 0 || local.alb_enabled
      error_message = "Hay servicios con path_patterns o host_headers: define alb_certificate_arn para crear el ALB."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : s.queue == null || contains(keys(local.all_queue_arns), s.queue)])
      error_message = "Un servicio usa una cola que no está en la topología de mensajería ni es ses-events (requiere ses_domain)."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : alltrue([for q in s.send_queues : contains(keys(local.all_queue_arns), q)])])
      error_message = "send_queues contiene una cola inexistente."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : alltrue([for t in s.publish_topics : contains(keys(module.messaging.topic_arns), t)])])
      error_message = "publish_topics contiene un tópico que no está en la topología."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : s.db_user == null || contains([for u in var.db_service_users : u.name], s.db_user)])
      error_message = "db_user debe existir en db_service_users."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : s.valkey_user == null || contains(keys(var.valkey_users), s.valkey_user)])
      error_message = "valkey_user debe existir en valkey_users."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : !s.files_access || length(module.files_bucket) > 0])
      error_message = "files_access requiere el bucket de archivos: define web_aliases o files_cors_allowed_origins."
    }
    precondition {
      condition     = alltrue([for k, s in var.services : !s.ses_send || length(module.ses) > 0])
      error_message = "ses_send requiere ses_domain."
    }
  }
}

module "service_fargate" {
  source   = "../modules/service-fargate"
  for_each = local.fargate_services

  name_prefix  = var.name_prefix
  service_name = each.key
  environment  = var.environment
  cluster_arn  = module.ecs_cluster.cluster_arn
  cluster_name = module.ecs_cluster.cluster_name
  vpc_id       = module.network.vpc_id
  vpc_cidr     = var.vpc_cidr
  subnet_ids   = module.network.private_subnet_ids

  image            = each.value.image
  command          = each.value.command
  container_port   = contains(keys(local.lb_services), each.key) ? coalesce(each.value.container_port, 3000) : each.value.container_port
  cpu              = each.value.cpu
  memory           = each.value.memory
  cpu_architecture = each.value.cpu_architecture
  desired_count    = each.value.desired_count

  capacity_provider_strategy = [{
    capacity_provider = each.value.spot ? "FARGATE_SPOT" : "FARGATE"
    weight            = 1
    base              = 0
  }]

  environment_variables = local.service_env[each.key]
  secrets               = local.service_secrets[each.key]
  secrets_kms_key_arns  = local.service_secret_kms_keys[each.key]
  task_policies         = local.service_policies[each.key]

  otlp_endpoint             = local.obs_endpoint
  otlp_authorization_secret = local.obs_auth

  enable_load_balancer   = contains(keys(local.lb_services), each.key)
  alb_listener_arn       = contains(keys(local.lb_services), each.key) ? module.alb[0].https_listener_arn : null
  alb_security_group_id  = contains(keys(local.lb_services), each.key) ? module.alb[0].security_group_id : null
  listener_rule_priority = try(local.listener_priority[each.key], 100)
  path_patterns          = each.value.path_patterns
  host_headers           = each.value.host_headers
  health_check_path      = each.value.health_check_path

  min_capacity          = each.value.min_capacity
  max_capacity          = each.value.max_capacity
  cpu_target_percent    = each.value.scale_on_queue != null ? null : coalesce(each.value.cpu_target_percent, 60)
  memory_target_percent = each.value.memory_target_percent

  sqs_scaling = each.value.scale_on_queue == null ? null : {
    queue_name          = reverse(split("/", local.all_queue_urls[each.value.queue]))[0]
    scale_out_threshold = each.value.scale_on_queue.scale_out_threshold
    messages_per_task   = each.value.scale_on_queue.messages_per_task
    steps               = each.value.scale_on_queue.steps
    scale_in_periods    = each.value.scale_on_queue.scale_in_periods
  }

  enable_execute_command = each.value.enable_execute_command
  exec_kms_key_arn       = each.value.enable_execute_command ? module.ecs_cluster.kms_key_arn : null
  exec_log_group_arn     = null

  depends_on = [terraform_data.services_check]
}

module "service_lambda" {
  source   = "../modules/service-lambda"
  for_each = local.lambda_services

  name_prefix   = var.name_prefix
  function_name = each.key
  environment   = var.environment

  handler           = each.value.handler
  runtime           = each.value.runtime
  filename          = each.value.filename
  s3_bucket         = each.value.s3_bucket
  s3_key            = each.value.s3_key
  s3_object_version = each.value.s3_object_version
  source_code_hash  = each.value.source_code_hash
  memory_size       = each.value.memory_size
  timeout           = each.value.timeout

  environment_variables = merge(
    local.service_env[each.key],
    each.value.db_user == null ? {} : { DB_SECRET_ARN = module.rds.service_secret_arns[each.value.db_user] },
  )
  secret_arns          = values(local.service_secrets[each.key])
  secrets_kms_key_arns = local.service_secret_kms_keys[each.key]
  task_policies        = local.service_policies[each.key]

  otel_layer_arn = try(coalesce(each.value.otel_layer_arn, var.lambda_otel_layer_arn), null)

  vpc_enabled = each.value.vpc_enabled
  vpc_id      = each.value.vpc_enabled ? module.network.vpc_id : null
  vpc_cidr    = each.value.vpc_enabled ? var.vpc_cidr : null
  subnet_ids  = each.value.vpc_enabled ? module.network.private_subnet_ids : []

  queue_arn                       = local.all_queue_arns[each.value.queue]
  queue_kms_key_arn               = module.messaging.kms_key_arn
  batch_size                      = each.value.batch_size
  maximum_batching_window_seconds = each.value.maximum_batching_window_seconds
  maximum_concurrency             = each.value.maximum_concurrency
  reserved_concurrent_executions  = each.value.reserved_concurrent_executions
  filter_patterns                 = each.value.filter_patterns

  alarm_topic_arn = local.alarm_topic_arn

  depends_on = [terraform_data.services_check]
}

# --- Acceso a RDS Proxy (escritura y lectura) y Valkey ------------------------
# Los dos proxies comparten security group. Las reglas van por servicio para
# no crear un ciclo entre los servicios y los módulos de datos.

resource "aws_vpc_security_group_ingress_rule" "proxy_from_service" {
  for_each = local.vpc_service_sg_ids

  security_group_id            = module.rds.proxy_security_group_id
  referenced_security_group_id = each.value
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Servicio ${each.key} hacia RDS Proxy"
}

resource "aws_vpc_security_group_ingress_rule" "valkey_from_service" {
  for_each = local.vpc_service_sg_ids

  security_group_id            = module.valkey.security_group_id
  referenced_security_group_id = each.value
  from_port                    = 6379
  to_port                      = 6380
  ip_protocol                  = "tcp"
  description                  = "Servicio ${each.key} hacia Valkey"
}

# --- ALB: solo CloudFront llega a la API --------------------------------------
# Para cada servicio verificado, dos reglas con prioridad mayor que la de su regla de
# servicio: con X-Origin-Verify reenvía al servicio; sin él, 403.

resource "aws_lb_listener_rule" "origin_verify_allow" {
  for_each = local.verified_services

  listener_arn = module.alb[0].https_listener_arn
  priority     = local.listener_priority[each.key] - 2

  action {
    type             = "forward"
    target_group_arn = module.service_fargate[each.key].target_group_arn
  }

  dynamic "condition" {
    for_each = length(each.value.path_patterns) > 0 ? [1] : []
    content {
      path_pattern {
        values = each.value.path_patterns
      }
    }
  }

  dynamic "condition" {
    for_each = length(each.value.host_headers) > 0 ? [1] : []
    content {
      host_header {
        values = each.value.host_headers
      }
    }
  }

  condition {
    http_header {
      http_header_name = "X-Origin-Verify"
      values           = [local.origin_verify_value]
    }
  }
}

resource "aws_lb_listener_rule" "origin_verify_deny" {
  for_each = local.verified_services

  listener_arn = module.alb[0].https_listener_arn
  priority     = local.listener_priority[each.key] - 1

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }

  dynamic "condition" {
    for_each = length(each.value.path_patterns) > 0 ? [1] : []
    content {
      path_pattern {
        values = each.value.path_patterns
      }
    }
  }

  dynamic "condition" {
    for_each = length(each.value.host_headers) > 0 ? [1] : []
    content {
      host_header {
        values = each.value.host_headers
      }
    }
  }
}
