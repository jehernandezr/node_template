# The runtime of a microservice, with its own state: its API (Lambda or Fargate), and optionally realtime
# (Fargate behind the public ALB), Fargate workers and Lambda consumers. Their roles, log groups, security
# groups and shared environment come from its service-base stack (ADR 0043), which is applied first. It reads
# network, platform and messaging from their stacks; it does not modify them, except for the routes it adds
# to the shared API and the rules of its listeners.

locals {
  svc  = var.service_name
  base = local.service_base

  components  = local.base.components
  api_lambda  = var.api != null && try(local.components["api"].runtime, null) == "lambda"
  api_fargate = var.api != null && try(local.components["api"].runtime, null) == "fargate"
  uses_lambda = local.api_lambda || length(var.consumers) > 0
  uses_ecs    = local.api_fargate || var.realtime != null || length(var.workers) > 0

  # Listener priority: the fixed entry of the service in listener-priorities.json (ADR 0039).
  listener_priorities = jsondecode(file("${path.module}/../../listener-priorities.json"))
  listener_priority   = lookup(local.listener_priorities, local.svc, null)
  uses_listener       = local.api_fargate || var.realtime != null

  # Each component this stack runs, as service-base defines it. A key service-base lacks maps to an empty
  # component, so the check below reports the mismatch instead of an invalid index.
  declared = concat(
    var.api == null ? [] : ["api"],
    var.realtime == null ? [] : ["realtime"],
    [for k in keys(var.workers) : "worker-${k}"],
    [for k in keys(var.consumers) : "consumer-${k}"],
  )
  missing_component = {
    name               = "missing"
    runtime            = null
    queue              = null
    role_arn           = null
    role_name          = null
    execution_role_arn = null
    log_group_name     = null
    security_group_id  = null
    environment        = {}
  }
  component = { for key in local.declared : key => try(local.components[key], local.missing_component) }

  fargate_environment = { for key, c in local.component : key => merge(local.base.fargate_environment, c.environment) }
  lambda_environment  = { for key, c in local.component : key => merge(local.base.lambda_environment, c.environment) }

  observability = local.platform.observability

  api_path_patterns = local.api_fargate ? flatten([for p in var.api.route_prefixes : [p, "${p}/*"]]) : []

  worker_queues   = { for k in keys(var.workers) : k => local.component["worker-${k}"].queue }
  consumer_queues = { for k in keys(var.consumers) : k => local.component["consumer-${k}"].queue }
}

# References to other stacks that variable validation cannot check.
resource "terraform_data" "service_check" {
  input = local.svc

  lifecycle {
    precondition {
      condition     = local.base.service_name == local.svc
      error_message = "The service-base state belongs to another service."
    }
    precondition {
      condition     = alltrue([for key in local.declared : contains(keys(local.components), key)])
      error_message = "Every api, realtime, worker and consumer set here needs its component in service-base, applied first: it runs with the role and security group made there."
    }
    precondition {
      condition     = !local.uses_ecs || var.image != null
      error_message = "The Fargate API, realtime and workers need image."
    }
    precondition {
      condition     = !local.uses_lambda || var.lambda_package != null
      error_message = "The Lambda API and consumers need lambda_package."
    }
    precondition {
      condition     = !local.uses_listener || local.listener_priority != null
      error_message = "A Fargate API or realtime needs the service in listener-priorities.json, with a priority no other service uses."
    }
    precondition {
      condition     = !local.api_fargate || local.platform.api_alb != null
      error_message = "A Fargate API needs the internal ALB of the platform stack, which exists with compute_enabled."
    }
    precondition {
      condition     = var.realtime == null || local.platform.realtime_alb != null
      error_message = "realtime needs realtime_alb_certificate_arn in the platform stack."
    }
    precondition {
      condition     = alltrue([for q in values(local.worker_queues) : q == null || contains(keys(local.messaging.queue_names), q)]) && alltrue([for q in values(local.consumer_queues) : q != null && contains(keys(local.messaging.queue_arns), q)])
      error_message = "A worker or consumer uses a queue that is neither in the topology nor ses-events."
    }
  }
}

# --- API ------------------------------------------------------------------------

module "api_lambda" {
  count  = local.api_lambda ? 1 : 0
  source = "../../modules/service-lambda"

  name_prefix   = var.name_prefix
  function_name = local.component["api"].name
  description   = "API of ${local.svc}"
  environment   = var.environment

  role_arn       = local.component["api"].role_arn
  role_name      = local.component["api"].role_name
  log_group_name = local.component["api"].log_group_name
  kms_key_arn    = local.base.kms_key_arn

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

  environment_variables = local.lambda_environment["api"]
  otel_layer_arn        = var.lambda_otel_layer_arn

  vpc_enabled                   = true
  security_group_id             = local.component["api"].security_group_id
  subnet_ids                    = local.network.private_subnet_ids
  additional_security_group_ids = local.base.data_security_group_ids

  alarm_topic_arn = local.platform.alarm_topic_arn

  depends_on = [terraform_data.service_check]
}

module "api_fargate" {
  count  = local.api_fargate ? 1 : 0
  source = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = local.component["api"].name
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  execution_role_arn            = local.component["api"].execution_role_arn
  task_role_arn                 = local.component["api"].role_arn
  log_group_name                = local.component["api"].log_group_name
  security_group_id             = local.component["api"].security_group_id
  additional_security_group_ids = local.base.data_security_group_ids

  image          = var.image
  command        = var.api.command
  container_port = var.api.container_port
  cpu            = var.api.cpu
  memory         = var.api.memory
  desired_count  = var.api.desired_count
  min_capacity   = var.api.min_capacity
  max_capacity   = var.api.max_capacity

  capacity_provider_strategy = [{ capacity_provider = var.api.spot ? "FARGATE_SPOT" : "FARGATE", weight = 1, base = 0 }]

  environment_variables = local.fargate_environment["api"]
  secrets               = local.base.fargate_secrets

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  enable_load_balancer   = true
  alb_listener_arn       = local.platform.api_alb.listener_arn
  alb_security_group_id  = local.platform.api_alb.security_group_id
  listener_rule_priority = local.listener_priority
  path_patterns          = local.api_path_patterns
  health_check_path      = var.api.health_check_path
  cpu_target_percent     = var.api.cpu_target_percent

  enable_execute_command = local.base.enable_execute_command

  depends_on = [terraform_data.service_check]
}

# Routes in the shared API. Changing the runtime only changes the target.
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

# --- Realtime ---------------------------------------------------------------------

module "realtime" {
  count  = var.realtime == null ? 0 : 1
  source = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = local.component["realtime"].name
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  execution_role_arn            = local.component["realtime"].execution_role_arn
  task_role_arn                 = local.component["realtime"].role_arn
  log_group_name                = local.component["realtime"].log_group_name
  security_group_id             = local.component["realtime"].security_group_id
  additional_security_group_ids = local.base.data_security_group_ids

  image          = var.image
  command        = var.realtime.command
  container_port = var.realtime.container_port
  cpu            = var.realtime.cpu
  memory         = var.realtime.memory
  desired_count  = var.realtime.desired_count
  min_capacity   = var.realtime.min_capacity
  max_capacity   = var.realtime.max_capacity

  environment_variables = local.fargate_environment["realtime"]
  secrets               = local.base.fargate_secrets

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  enable_load_balancer   = true
  alb_listener_arn       = local.platform.realtime_alb.listener_arn
  alb_security_group_id  = local.platform.realtime_alb.security_group_id
  listener_rule_priority = local.listener_priority
  path_patterns          = var.realtime.path_patterns
  host_headers           = var.realtime.host_headers
  health_check_path      = var.realtime.health_check_path
  cpu_target_percent     = var.realtime.cpu_target_percent

  enable_execute_command = local.base.enable_execute_command

  depends_on = [terraform_data.service_check]
}

# --- Workers and consumers ----------------------------------------------------------

module "worker" {
  for_each = var.workers
  source   = "../../modules/service-fargate"

  name_prefix  = var.name_prefix
  service_name = local.component["worker-${each.key}"].name
  environment  = var.environment
  cluster_arn  = local.platform.ecs_cluster.arn
  cluster_name = local.platform.ecs_cluster.name
  vpc_id       = local.network.vpc_id
  subnet_ids   = local.network.private_subnet_ids

  execution_role_arn            = local.component["worker-${each.key}"].execution_role_arn
  task_role_arn                 = local.component["worker-${each.key}"].role_arn
  log_group_name                = local.component["worker-${each.key}"].log_group_name
  security_group_id             = local.component["worker-${each.key}"].security_group_id
  additional_security_group_ids = local.base.data_security_group_ids

  image         = var.image
  command       = each.value.command
  cpu           = each.value.cpu
  memory        = each.value.memory
  desired_count = each.value.min_capacity
  min_capacity  = each.value.min_capacity
  max_capacity  = local.worker_queues[each.key] == null ? each.value.min_capacity : each.value.max_capacity

  capacity_provider_strategy = [{ capacity_provider = each.value.spot ? "FARGATE_SPOT" : "FARGATE", weight = 1, base = 0 }]

  environment_variables = local.fargate_environment["worker-${each.key}"]
  secrets               = local.base.fargate_secrets

  otlp_endpoint             = try(local.observability.otlp_endpoint, null)
  otlp_authorization_secret = try(local.observability.otlp_authorization_value_from, null)

  cpu_target_percent = null
  sqs_scaling = local.worker_queues[each.key] == null ? null : {
    queue_name          = try(local.messaging.queue_names[local.worker_queues[each.key]], "")
    scale_out_threshold = each.value.scale_out_threshold
    messages_per_task   = each.value.messages_per_task
    steps               = each.value.steps
    scale_in_periods    = each.value.scale_in_periods
  }

  enable_execute_command = local.base.enable_execute_command

  depends_on = [terraform_data.service_check]
}

module "consumer" {
  for_each = var.consumers
  source   = "../../modules/service-lambda"

  name_prefix   = var.name_prefix
  function_name = local.component["consumer-${each.key}"].name
  description   = "Consumer ${each.key} of ${local.svc}"
  environment   = var.environment

  role_arn       = local.component["consumer-${each.key}"].role_arn
  role_name      = local.component["consumer-${each.key}"].role_name
  log_group_name = local.component["consumer-${each.key}"].log_group_name
  kms_key_arn    = local.base.kms_key_arn

  handler           = each.value.handler
  runtime           = var.lambda_runtime
  memory_size       = each.value.memory_size
  timeout           = each.value.timeout
  filename          = try(var.lambda_package.filename, null)
  s3_bucket         = try(var.lambda_package.s3_bucket, null)
  s3_key            = try(var.lambda_package.s3_key, null)
  s3_object_version = try(var.lambda_package.s3_object_version, null)
  source_code_hash  = try(var.lambda_package.source_code_hash, null)

  environment_variables = local.lambda_environment["consumer-${each.key}"]
  otel_layer_arn        = var.lambda_otel_layer_arn

  vpc_enabled                   = true
  security_group_id             = local.component["consumer-${each.key}"].security_group_id
  subnet_ids                    = local.network.private_subnet_ids
  additional_security_group_ids = local.base.data_security_group_ids

  queue_arn                       = try(local.messaging.queue_arns[local.consumer_queues[each.key]], null)
  queue_kms_key_arn               = local.messaging.kms_key_arn
  batch_size                      = each.value.batch_size
  maximum_batching_window_seconds = each.value.maximum_batching_window_seconds
  maximum_concurrency             = each.value.maximum_concurrency
  filter_patterns                 = each.value.filter_patterns

  alarm_topic_arn = local.platform.alarm_topic_arn

  depends_on = [terraform_data.service_check]
}
