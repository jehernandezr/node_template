# component-base module

What one component of a service needs before it runs: the role it runs with, its log group and its security group. The `service-base` stack creates one per component and per one-off task, so they exist before the `service` stack runs the component with `service-fargate` or `service-lambda` ([ADR 0043](../../../../../docs/adr/0043-deploy-migrations-and-rollback.md)).

## What it creates

- `runtime = "fargate"`: an execution role (the ECS managed policy, the declared secrets and their keys, and the logs key) and a task role with `task_policies` and, with `enable_execute_command`, the ECS Exec channels.
- `runtime = "lambda"`: a function role that writes its logs, uses its key for the environment and the async DLQ, writes X-Ray traces with `tracing_mode = "Active"`, reads the declared secrets in one `BatchGetSecretValue` call (granted on `*`, since it takes no resource scope, with `GetSecretValue` scoped to each secret), attaches to the VPC and carries `task_policies`.
- A KMS-encrypted log group: `/ecs/<name_prefix>/<name>` on Fargate, `/aws/lambda/<name_prefix>-<name>` on Lambda. The key is `kms_key_arn` or one the module creates.
- A security group with HTTPS-only egress. The runtime modules add the ALB ingress and the data clients group.

## Main inputs

| Variable                                     | Description                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `name_prefix`, `name`                        | Names: roles, log group and security group take `<name_prefix>-<name>`.    |
| `runtime`                                    | `fargate` or `lambda`.                                                     |
| `vpc_id`                                     | VPC of the security group.                                                 |
| `secret_arns`, `secrets_kms_key_arns`        | Secrets the component reads (a JSON key suffix is ignored) and their keys. |
| `task_policies`                              | Map of name to IAM policy JSON for the role the code runs with.            |
| `enable_execute_command`, `exec_kms_key_arn` | ECS Exec on Fargate.                                                       |
| `kms_key_arn`, `log_retention_days`          | Logs key and retention.                                                    |

## Outputs

`runtime`, `role_arn`, `role_name`, `execution_role_arn` and `execution_role_name` (null on Lambda), `log_group_name`, `security_group_id`, `kms_key_arn`.
