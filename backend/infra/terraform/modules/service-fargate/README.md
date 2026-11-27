# service-fargate module

A microservice on Fargate: an API with inbound traffic behind the ALB, or a worker without traffic that scales on the depth of a queue. Its roles, log group and security group come from `component-base`, so they exist before the task.

## What it creates

- Task definition (ARM64 by default) with the given execution and task roles, environment variables, `NODE_ENV=production`, Secrets Manager secrets by ARN and logs in the given log group. Without `command`, an API (with `container_port`) runs the image command, `node main.mjs`, and a worker runs `node worker.mjs`.
- OpenTelemetry: `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` and `OTEL_EXPORTER_OTLP_*`. With `otel_collector_sidecar = true` (default) the ADOT collector runs as a non-essential sidecar: the application exports to `localhost:4318` and the collector forwards to OpenObserve with the authorization header from the secret.
- ECS service with circuit breaker and rollback, `initProcessEnabled` and optional ECS Exec (the task role gets its channels from `component-base`).
- With `enable_load_balancer`: target group without stickiness, listener rule by path or host, ingress on the given security group from the ALB and the matching egress on the ALB security group.
- Access to RDS Proxy, replicas, Valkey and OpenObserve comes with `additional_security_group_ids` (clients security group of the data stack), with rules toward each destination.
- Autoscaling: CPU (and memory) by target tracking, and by queue with steps from zero tasks.

## Main inputs

| Variable                                                                                                                       | Description                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `name_prefix`, `service_name`, `environment`                                                                                   | Names and environment.                                                                                                                      |
| `execution_role_arn`, `task_role_arn`, `log_group_name`, `security_group_id`                                                   | Roles, log group and security group from `component-base`.                                                                                  |
| `cluster_arn`, `cluster_name`                                                                                                  | Outputs of `ecs-cluster`.                                                                                                                   |
| `vpc_id`, `subnet_ids`                                                                                                         | Private network.                                                                                                                            |
| `image`, `command`, `container_port`, `cpu`, `memory`                                                                          | Container and size.                                                                                                                         |
| `environment_variables`, `secrets`                                                                                             | Environment without secrets and a map of name to secret ARN (with optional JSON key).                                                       |
| `otlp_endpoint`, `otlp_authorization_secret`                                                                                   | `otlp_http_endpoint` and `otlp_authorization_value_from` outputs of `observability`.                                                        |
| `enable_load_balancer`, `alb_listener_arn`, `alb_security_group_id`, `path_patterns`, `host_headers`, `listener_rule_priority` | ALB integration.                                                                                                                            |
| `min_capacity`, `max_capacity`, `cpu_target_percent`, `memory_target_percent`                                                  | Metric-based autoscaling.                                                                                                                   |
| `sqs_scaling`                                                                                                                  | `queue_name`, `messages_per_task`, `steps`: queue-based autoscaling. With `min_capacity = 0` the worker shuts down when the queue is empty. |
| `capacity_provider_strategy`                                                                                                   | `FARGATE` or `FARGATE_SPOT` (interruption-tolerant workers).                                                                                |

## Outputs

`service_name`, `service_arn`, `task_definition_arn`, `target_group_arn`, `target_group_arn_suffix`, `target_group_name_prefix`, `listener_rule_priority`, `min_capacity`, `max_capacity`, `autoscaling_resource_id`.

## Notes

- Queue scaling uses two alarms: it scales out with the visible messages and scales in to the minimum when visible plus in-flight reach zero for `scale_in_periods` minutes. In workers, set `cpu_target_percent = null` so the CPU policy does not compete with the queue policy.
- The target group name is a prefix of up to 6 characters from `service_name` plus a suffix that AWS makes unique, with `create_before_destroy`. A full name would not fit the 32-character limit with real prefixes, and a change that replaces the target group creates the new one before the old one goes.
- Without NAT, the task reaches AWS through VPC endpoints. Calls to the Internet (Claude API, APNs, FCM, payments) need an egress route defined by `network`.
- The collector image has a default version that you must review and pin.
