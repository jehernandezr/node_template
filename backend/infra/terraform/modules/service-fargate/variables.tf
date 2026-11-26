variable "name_prefix" {
  description = "Name prefix shared with the cluster, for example nt-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "service_name" {
  description = "Short service name, for example reports or realtime."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.service_name))
    error_message = "service_name must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "environment" {
  description = "Environment (dev, staging or prod). Published as deployment.environment in OpenTelemetry."
  type        = string
}

variable "cluster_arn" {
  description = "ECS cluster ARN."
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name, for autoscaling and metrics."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "additional_security_group_ids" {
  description = "Extra security groups for the tasks. The data clients one (data stack) opens egress to RDS Proxy, the replicas, Valkey and OpenObserve; the service one only allows outbound HTTPS."
  type        = list(string)
  default     = []
}

variable "subnet_ids" {
  description = "Private subnets where the tasks run."
  type        = list(string)
}

variable "image" {
  description = "Container image with its tag or digest, for example <account>.dkr.ecr.<region>.amazonaws.com/reports:1.2.3."
  type        = string
}

variable "command" {
  description = "Container command. Null runs the image default (node main.mjs) for a task with container_port, and node worker.mjs for a worker without one."
  type        = list(string)
  default     = null
}

variable "container_port" {
  description = "Container port. Null for workers without inbound traffic."
  type        = number
  default     = null
}

variable "cpu" {
  description = "Task CPU units (256, 512, 1024, 2048, 4096, 8192 or 16384)."
  type        = number
  default     = 512

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096, 8192, 16384], var.cpu)
    error_message = "cpu must be 256, 512, 1024, 2048, 4096, 8192 or 16384."
  }
}

variable "memory" {
  description = "Task memory in MiB. Must be a valid Fargate combination for cpu."
  type        = number
  default     = 1024
}

variable "cpu_architecture" {
  description = "Task architecture: ARM64 or X86_64."
  type        = string
  default     = "ARM64"

  validation {
    condition     = contains(["ARM64", "X86_64"], var.cpu_architecture)
    error_message = "cpu_architecture must be ARM64 or X86_64."
  }
}

variable "desired_count" {
  description = "Initial task count. Autoscaling adjusts it and Terraform does not revert it."
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Autoscaling minimum task count. 0 for workers that scale on a queue."
  type        = number
  default     = 1

  validation {
    condition     = var.min_capacity >= 0
    error_message = "min_capacity cannot be negative."
  }
}

variable "max_capacity" {
  description = "Autoscaling maximum task count."
  type        = number
  default     = 4

  validation {
    condition     = var.max_capacity >= 1
    error_message = "max_capacity must be at least 1."
  }
}

variable "capacity_provider_strategy" {
  description = "Capacity provider strategy for the service. Use FARGATE_SPOT only for interruption-tolerant workers."
  type = list(object({
    capacity_provider = string
    weight            = number
    base              = optional(number, 0)
  }))
  default = [{ capacity_provider = "FARGATE", weight = 1, base = 0 }]

  validation {
    condition     = alltrue([for s in var.capacity_provider_strategy : contains(["FARGATE", "FARGATE_SPOT"], s.capacity_provider)])
    error_message = "capacity_provider must be FARGATE or FARGATE_SPOT."
  }
}

variable "environment_variables" {
  description = "Application environment variables, without secrets."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets as environment variables: variable name to Secrets Manager ARN, with an optional JSON key (arn:...:secret:name-xxxxxx:KEY::)."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for v in values(var.secrets) : can(regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v))])
    error_message = "Each secrets value must be a Secrets Manager ARN."
  }
}

variable "secrets_kms_key_arns" {
  description = "KMS keys that encrypt the secrets, so the execution role can decrypt them."
  type        = list(string)
  default     = []
}

variable "otlp_endpoint" {
  description = "Base OTLP HTTP endpoint of OpenObserve (otlp_http_endpoint output of the observability module). Null disables OpenTelemetry."
  type        = string
  default     = null
}

variable "otlp_authorization_secret" {
  description = "Secret with the OTLP Authorization header, as a valueFrom (otlp_authorization_value_from output of observability)."
  type        = string
  default     = null
}

variable "otel_collector_sidecar" {
  description = "Runs the ADOT collector as a sidecar. The application exports to localhost and the collector forwards to OpenObserve. If false, the application exports straight to the endpoint."
  type        = bool
  default     = true
}

variable "otel_collector_image" {
  description = "ADOT collector image for the sidecar. Pin a reviewed version."
  type        = string
  default     = "public.ecr.aws/aws-observability/aws-otel-collector:v0.43.1"
}

variable "enable_load_balancer" {
  description = "Attaches the service to an ALB with a target group and a listener rule. Requires container_port."
  type        = bool
  default     = false
}

variable "alb_listener_arn" {
  description = "ARN of the ALB HTTPS listener where the rule is created. Required with enable_load_balancer."
  type        = string
  default     = null
}

variable "alb_security_group_id" {
  description = "ALB security group. The module adds its egress to the service. Required with enable_load_balancer."
  type        = string
  default     = null
}

variable "listener_rule_priority" {
  description = "Listener rule priority. Unique per listener."
  type        = number
  default     = 100
}

variable "path_patterns" {
  description = "Path patterns that route to the service, for example [\"/realtime/*\"]."
  type        = list(string)
  default     = []
}

variable "host_headers" {
  description = "Hosts that route to the service, for example [\"realtime.example.com\"]."
  type        = list(string)
  default     = []
}

variable "health_check_path" {
  description = "Target group health check path."
  type        = string
  default     = "/health"
}

variable "health_check_grace_period_seconds" {
  description = "Grace period in seconds before the ALB health check counts against a new task."
  type        = number
  default     = 60
}

variable "deregistration_delay_seconds" {
  description = "Seconds the ALB waits while draining connections. Raise it for long-lived WebSocket and SSE connections."
  type        = number
  default     = 60
}

variable "stop_timeout_seconds" {
  description = "Seconds between SIGTERM and SIGKILL for the container. Maximum 120."
  type        = number
  default     = 30

  validation {
    condition     = var.stop_timeout_seconds >= 2 && var.stop_timeout_seconds <= 120
    error_message = "stop_timeout_seconds must be between 2 and 120."
  }
}

variable "container_health_check_command" {
  description = "Container health check command, for example [\"CMD-SHELL\", \"curl -f http://localhost:3000/health || exit 1\"]. Null leaves it undefined."
  type        = list(string)
  default     = null
}

variable "cpu_target_percent" {
  description = "Autoscaling target for average CPU. Null disables this policy."
  type        = number
  default     = 60

  validation {
    condition     = var.cpu_target_percent == null || (coalesce(var.cpu_target_percent, 50) > 0 && coalesce(var.cpu_target_percent, 50) < 100)
    error_message = "cpu_target_percent must be between 1 and 99."
  }
}

variable "memory_target_percent" {
  description = "Autoscaling target for average memory. Null disables this policy."
  type        = number
  default     = null
}

variable "sqs_scaling" {
  description = "Queue depth autoscaling: adds tasks based on visible messages (messages_per_task per task, up to steps steps) and scales down to min_capacity when the queue and in-flight messages reach zero. Combine it with cpu_target_percent = null in workers."
  type = object({
    queue_name          = string
    scale_out_threshold = optional(number, 1)
    messages_per_task   = optional(number, 100)
    steps               = optional(number, 5)
    scale_in_periods    = optional(number, 10)
  })
  default = null

  validation {
    condition     = var.sqs_scaling == null || (try(var.sqs_scaling.steps, 2) >= 2 && try(var.sqs_scaling.messages_per_task, 1) >= 1)
    error_message = "sqs_scaling.steps must be at least 2 and messages_per_task at least 1."
  }
}

variable "task_policies" {
  description = "Inline IAM policies for the task role: name to JSON document. SQS, S3, SES and other permissions go here."
  type        = map(string)
  default     = {}
}

variable "enable_execute_command" {
  description = "Enables ECS Exec for debugging. Sessions are logged with the cluster key and log group."
  type        = bool
  default     = false
}

variable "exec_kms_key_arn" {
  description = "Cluster KMS key (kms_key_arn output of ecs-cluster), so the task can open ECS Exec sessions."
  type        = string
  default     = null
}

variable "exec_log_group_arn" {
  description = "ARN of the cluster ECS Exec log group. If null, the role can write to any log group under /ecs/."
  type        = string
  default     = null
}

variable "readonly_root_filesystem" {
  description = "Mounts the container root filesystem as read-only."
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Retention in days for the service log group."
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "KMS key for the log group. It must allow logs.<region>.amazonaws.com on /ecs/<name_prefix>/*; the ecs-cluster key works. If null, the module creates its own."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for the module resources."
  type        = map(string)
  default     = {}
}
