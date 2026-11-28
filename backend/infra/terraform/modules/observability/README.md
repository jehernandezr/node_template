# observability module

Single-node OpenObserve on Fargate. It receives logs, metrics and traces over OTLP HTTP from the services' collectors and the Lambdas.

## What it creates

- ECS service with one task running OpenObserve (ARM64 by default). Telemetry data goes to a KMS-encrypted S3 bucket; metadata (users, dashboards, alerts) lives in SQLite on KMS-encrypted EFS with backup.
- Secrets Manager secret with the root user, a generated password and the `Authorization` header ready for the OTLP exporters. The password is ephemeral and written through a write-only attribute, so neither it nor the header reaches the Terraform state.
- KMS key with rotation for the secret, the bucket, EFS and the logs.
- Entry through its own internal ALB (default) or through a rule on the listener of an existing ALB.
- Least-privilege execution and task roles, security groups and a log group with KMS.

## Main inputs

| Variable                           | Description                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `cluster_arn`                      | ECS cluster (`ecs-cluster` module).                                                                              |
| `vpc_id`, `vpc_cidr`, `subnet_ids` | Private network.                                                                                                 |
| `create_internal_alb`              | `true` creates an internal ALB. `false` requires `alb_listener_arn`, `alb_security_group_id` and `host_headers`. |
| `internal_alb_certificate_arn`     | If null, the internal ALB serves HTTP on port 80 only inside the VPC.                                            |
| `root_user_email`                  | Root user.                                                                                                       |
| `image`                            | Image pinned by version. Check the version before applying.                                                      |
| `data_retention_days`              | Data retention (30 by default).                                                                                  |

## Outputs

`otlp_http_endpoint`, `console_url`, `secret_arn`, `otlp_authorization_value_from`, `kms_key_arn`, `storage_bucket_name`, `service_name`, `security_group_id`, `alb_dns_name`, `alb_zone_id`.

## How services connect

```hcl
module "reports" {
  source = "../../modules/service-fargate"
  # ...
  otlp_endpoint             = module.observability.otlp_http_endpoint
  otlp_authorization_secret = module.observability.otlp_authorization_value_from
  secrets_kms_key_arns      = [module.observability.kms_key_arn]
}
```

For Lambda, the ADOT layer collector uses the same endpoint and the header stored in the secret.

## Limits

- It is a single node: one task at a time, and a deployment stops the previous one before starting the new one. There are a few minutes without ingestion on each version change; the collectors retry. High availability needs OpenObserve cluster mode with NATS and PostgreSQL, out of scope for this module.
- Only OTLP HTTP is exposed. OTLP gRPC requires an HTTPS listener with a gRPC target group.
- The internal ALB does not keep access logs.
