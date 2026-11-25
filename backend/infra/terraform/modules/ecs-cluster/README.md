# ecs-cluster module

ECS cluster for Fargate with the `FARGATE` and `FARGATE_SPOT` capacity providers, Container Insights and audited ECS Exec.

## What it creates

- ECS cluster with Container Insights (`enhanced` by default).
- `FARGATE` and `FARGATE_SPOT` capacity providers, with a configurable default strategy.
- KMS-encrypted log group `/ecs/<name_prefix>/exec` for ECS Exec sessions. The command and its output are logged.
- KMS key with yearly rotation, or the one you pass in `kms_key_arn`.

## Main inputs

| Variable                             | Description                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `name_prefix`                        | Prefix and cluster name.                                                          |
| `container_insights`                 | `enhanced`, `enabled` or `disabled`.                                              |
| `default_capacity_provider_strategy` | List of `capacity_provider`, `weight` and `base`.                                 |
| `kms_key_arn`                        | Existing key. Must allow `logs.<region>.amazonaws.com` on `/ecs/<name_prefix>/*`. |

## Outputs

`cluster_arn`, `cluster_name`, `cluster_id`, `kms_key_arn`, `exec_log_group_name`.

## Usage

```hcl
module "ecs_cluster" {
  source      = "../../modules/ecs-cluster"
  name_prefix = "nt-dev"
}
```

`service-fargate` receives `cluster_arn` and `cluster_name`; `observability`, only `cluster_arn`.
