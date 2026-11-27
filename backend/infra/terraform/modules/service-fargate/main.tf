data "aws_region" "current" {}

locals {
  full_name = "${var.name_prefix}-${var.service_name}"
  region    = data.aws_region.current.region

  otel_enabled    = var.otlp_endpoint != null
  otel_sidecar    = local.otel_enabled && var.otel_collector_sidecar
  has_otlp_secret = var.otlp_authorization_secret != null

  worker_command = ["node", "worker.mjs"]
  command        = var.command != null ? var.command : (var.container_port == null ? local.worker_command : null)

  app_environment = merge(
    local.otel_app_env,
    { SERVICE_NAME = var.service_name, NODE_ENV = "production" },
    var.environment_variables,
  )

  # Application OTEL_* variables. With the sidecar it exports to localhost; without it, straight to OpenObserve.
  otel_app_env = !local.otel_enabled ? {} : {
    OTEL_SERVICE_NAME           = var.service_name
    OTEL_RESOURCE_ATTRIBUTES    = "service.namespace=${var.name_prefix},deployment.environment=${var.environment}"
    OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf"
    OTEL_EXPORTER_OTLP_ENDPOINT = local.otel_sidecar ? "http://localhost:4318" : var.otlp_endpoint
  }

  collector_config = yamlencode({
    receivers = {
      otlp = {
        protocols = {
          grpc = { endpoint = "127.0.0.1:4317" }
          http = { endpoint = "127.0.0.1:4318" }
        }
      }
    }
    processors = { batch = { timeout = "5s" } }
    exporters = {
      otlphttp = merge(
        { endpoint = coalesce(var.otlp_endpoint, "http://localhost") },
        local.has_otlp_secret ? { headers = { Authorization = "$${env:OTLP_AUTHORIZATION}" } } : {}
      )
    }
    service = {
      pipelines = {
        traces  = { receivers = ["otlp"], processors = ["batch"], exporters = ["otlphttp"] }
        metrics = { receivers = ["otlp"], processors = ["batch"], exporters = ["otlphttp"] }
        logs    = { receivers = ["otlp"], processors = ["batch"], exporters = ["otlphttp"] }
      }
    }
  })

  log_configuration = {
    logDriver = "awslogs"
    options = {
      "awslogs-group"         = var.log_group_name
      "awslogs-region"        = local.region
      "awslogs-stream-prefix" = "app"
    }
  }

  app_container = merge(
    {
      name                   = var.service_name
      image                  = var.image
      essential              = true
      readonlyRootFilesystem = var.readonly_root_filesystem
      stopTimeout            = var.stop_timeout_seconds
      environment            = [for k, v in local.app_environment : { name = k, value = v }]
      secrets                = [for k, v in var.secrets : { name = k, valueFrom = v }]
      linuxParameters        = { initProcessEnabled = true }
      logConfiguration       = local.log_configuration
    },
    local.command == null ? {} : { command = local.command },
    var.container_port == null ? {} : {
      portMappings = [{ containerPort = var.container_port, protocol = "tcp" }]
    },
    var.container_health_check_command == null ? {} : {
      healthCheck = {
        command     = var.container_health_check_command
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    },
  )

  collector_container = {
    name      = "otel-collector"
    image     = var.otel_collector_image
    essential = false
    cpu       = 0
    environment = [
      { name = "AOT_CONFIG_CONTENT", value = local.collector_config },
    ]
    secrets = local.has_otlp_secret ? [{ name = "OTLP_AUTHORIZATION", valueFrom = var.otlp_authorization_secret }] : []
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "otel"
      }
    }
  }

  alb_count = var.enable_load_balancer ? 1 : 0

  target_group_name_prefix = "${substr(replace(var.service_name, "/[^a-z0-9]/", ""), 0, 5)}-"
}

resource "terraform_data" "input_check" {
  input = local.full_name

  lifecycle {
    precondition {
      condition     = !var.enable_load_balancer || (var.container_port != null && var.alb_listener_arn != null && var.alb_security_group_id != null)
      error_message = "enable_load_balancer requires container_port, alb_listener_arn and alb_security_group_id."
    }

    precondition {
      condition     = !var.enable_load_balancer || length(var.path_patterns) + length(var.host_headers) > 0
      error_message = "enable_load_balancer requires path_patterns or host_headers for the listener rule."
    }

    precondition {
      condition     = var.min_capacity <= var.max_capacity
      error_message = "min_capacity cannot exceed max_capacity."
    }

    precondition {
      condition     = var.desired_count >= var.min_capacity && var.desired_count <= var.max_capacity
      error_message = "desired_count must be between min_capacity and max_capacity."
    }
  }
}

# --- Network ----------------------------------------------------------------

resource "aws_vpc_security_group_ingress_rule" "from_alb" {
  count = local.alb_count

  security_group_id            = var.security_group_id
  referenced_security_group_id = var.alb_security_group_id
  from_port                    = var.container_port
  to_port                      = var.container_port
  ip_protocol                  = "tcp"
  description                  = "Traffic from the ALB"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_service" {
  count = local.alb_count

  security_group_id            = var.alb_security_group_id
  referenced_security_group_id = var.security_group_id
  from_port                    = var.container_port
  to_port                      = var.container_port
  ip_protocol                  = "tcp"
  description                  = "ALB to ${local.full_name}"
}

resource "aws_lb_target_group" "this" {
  count = local.alb_count

  name_prefix          = local.target_group_name_prefix
  port                 = var.container_port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = var.deregistration_delay_seconds

  # No sticky sessions: shared state lives in Valkey.
  stickiness {
    type    = "lb_cookie"
    enabled = false
  }

  health_check {
    path                = var.health_check_path
    matcher             = "200-399"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, { Name = local.full_name })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener_rule" "this" {
  count = local.alb_count

  listener_arn = var.alb_listener_arn
  priority     = var.listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this[0].arn
  }

  dynamic "condition" {
    for_each = length(var.path_patterns) > 0 ? [1] : []

    content {
      path_pattern {
        values = var.path_patterns
      }
    }
  }

  dynamic "condition" {
    for_each = length(var.host_headers) > 0 ? [1] : []

    content {
      host_header {
        values = var.host_headers
      }
    }
  }

  tags = var.tags
}

# --- Task and service -------------------------------------------------------

resource "aws_ecs_task_definition" "this" {
  family                   = local.full_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode(
    concat([local.app_container], local.otel_sidecar ? [local.collector_container] : [])
  )

  tags = var.tags

  depends_on = [terraform_data.input_check]
}

resource "aws_ecs_service" "this" {
  name                   = var.service_name
  cluster                = var.cluster_arn
  task_definition        = aws_ecs_task_definition.this.arn
  desired_count          = var.desired_count
  enable_execute_command = var.enable_execute_command
  propagate_tags         = "SERVICE"

  health_check_grace_period_seconds = var.enable_load_balancer ? var.health_check_grace_period_seconds : null

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  dynamic "capacity_provider_strategy" {
    for_each = var.capacity_provider_strategy

    content {
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = capacity_provider_strategy.value.weight
      base              = capacity_provider_strategy.value.base
    }
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = concat([var.security_group_id], var.additional_security_group_ids)
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.enable_load_balancer ? [1] : []

    content {
      target_group_arn = aws_lb_target_group.this[0].arn
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  tags = merge(var.tags, { Name = local.full_name })

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_lb_listener_rule.this]
}

# --- Autoscaling ------------------------------------------------------------

resource "aws_appautoscaling_target" "this" {
  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  min_capacity       = var.min_capacity
  max_capacity       = var.max_capacity

  tags = var.tags
}

resource "aws_appautoscaling_policy" "cpu" {
  count = var.cpu_target_percent == null ? 0 : 1

  name               = "${local.full_name}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  resource_id        = aws_appautoscaling_target.this.resource_id

  target_tracking_scaling_policy_configuration {
    target_value       = var.cpu_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "memory" {
  count = var.memory_target_percent == null ? 0 : 1

  name               = "${local.full_name}-memory"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  resource_id        = aws_appautoscaling_target.this.resource_id

  target_tracking_scaling_policy_configuration {
    target_value       = var.memory_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

# Queue-based step scaling: target tracking does not start from zero tasks.
resource "aws_appautoscaling_policy" "sqs_out" {
  count = var.sqs_scaling == null ? 0 : 1

  name               = "${local.full_name}-sqs-out"
  policy_type        = "StepScaling"
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  resource_id        = aws_appautoscaling_target.this.resource_id

  step_scaling_policy_configuration {
    adjustment_type         = "ExactCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    dynamic "step_adjustment" {
      for_each = range(var.sqs_scaling.steps)

      content {
        metric_interval_lower_bound = step_adjustment.value * var.sqs_scaling.messages_per_task
        metric_interval_upper_bound = step_adjustment.value == var.sqs_scaling.steps - 1 ? null : (step_adjustment.value + 1) * var.sqs_scaling.messages_per_task
        scaling_adjustment          = step_adjustment.value == var.sqs_scaling.steps - 1 ? var.max_capacity : min(step_adjustment.value + 1, var.max_capacity)
      }
    }
  }
}

resource "aws_appautoscaling_policy" "sqs_in" {
  count = var.sqs_scaling == null ? 0 : 1

  name               = "${local.full_name}-sqs-in"
  policy_type        = "StepScaling"
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  resource_id        = aws_appautoscaling_target.this.resource_id

  step_scaling_policy_configuration {
    adjustment_type         = "ExactCapacity"
    cooldown                = 300
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = var.min_capacity
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_backlog_high" {
  count = var.sqs_scaling == null ? 0 : 1

  alarm_name          = "${local.full_name}-sqs-backlog-high"
  alarm_description   = "Messages are waiting in ${var.sqs_scaling.queue_name}: scale up the tasks of ${local.full_name}"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = var.sqs_scaling.scale_out_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_scaling.queue_name
  }

  alarm_actions = [aws_appautoscaling_policy.sqs_out[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "sqs_backlog_empty" {
  count = var.sqs_scaling == null ? 0 : 1

  alarm_name          = "${local.full_name}-sqs-backlog-empty"
  alarm_description   = "${var.sqs_scaling.queue_name} is empty with no messages in flight: scale ${local.full_name} down to the minimum"
  threshold           = 0
  evaluation_periods  = var.sqs_scaling.scale_in_periods
  comparison_operator = "LessThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "total"
    expression  = "visible + inflight"
    label       = "Pending and in-flight messages"
    return_data = true
  }

  metric_query {
    id = "visible"

    metric {
      namespace   = "AWS/SQS"
      metric_name = "ApproximateNumberOfMessagesVisible"
      period      = 60
      stat        = "Maximum"

      dimensions = {
        QueueName = var.sqs_scaling.queue_name
      }
    }
  }

  metric_query {
    id = "inflight"

    metric {
      namespace   = "AWS/SQS"
      metric_name = "ApproximateNumberOfMessagesNotVisible"
      period      = 60
      stat        = "Maximum"

      dimensions = {
        QueueName = var.sqs_scaling.queue_name
      }
    }
  }

  alarm_actions = [aws_appautoscaling_policy.sqs_in[0].arn]

  tags = var.tags
}
