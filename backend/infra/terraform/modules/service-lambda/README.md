# service-lambda module

An arm64 Lambda: a consumer of an SQS queue with partial batch responses, or an API behind API Gateway HTTP (`queue_arn = null`, routes with the `api-routes` module).

## What it creates

- arm64 Lambda function with a local or S3 package, JSON logging, `NODE_ENV=production`, KMS-encrypted environment variables and X-Ray enabled.
- SQS event source mapping with `ReportBatchItemFailures`: only the failed messages go back to the queue and, after the retries run out, go to their DLQ (defined in `messaging`). Supports `maximum_concurrency`, batching window and filters.
- Optional reserved concurrency (`reserved_concurrent_executions`).
- Dead-letter queue for asynchronous invocations (`dead_letter_config`), KMS-encrypted, with an alarm.
- OpenTelemetry (ADOT) layer through `otel_layer_arn`: the module sets `AWS_LAMBDA_EXEC_WRAPPER`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` and the configuration of the collector that forwards to OpenObserve.
- Log group with retention and KMS, least-privilege role and an errors alarm.
- Optional: execution in the VPC with its own security group (`vpc_enabled`), with HTTPS-only egress. Access to RDS Proxy, replicas, Valkey and OpenObserve comes with `additional_security_group_ids` (clients security group of the data stack).

## Main inputs

| Variable                                                                                  | Description                                                                                  |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `name_prefix`, `function_name`, `environment`                                             | Names and environment.                                                                       |
| `handler`, `runtime`                                                                      | Handler and runtime (`nodejs24.x`, the major version in `.nvmrc`; any other fails the plan). |
| `filename` or `s3_bucket` with `s3_key`, `source_code_hash`                               | Package.                                                                                     |
| `queue_arn`, `queue_kms_key_arn`                                                          | Queue from `messaging` and its KMS key.                                                      |
| `batch_size`, `maximum_batching_window_seconds`, `maximum_concurrency`, `filter_patterns` | Consumption.                                                                                 |
| `reserved_concurrent_executions`                                                          | Protects the database from spikes.                                                           |
| `otel_layer_arn`, `otel_collector_config_uri`                                             | OpenTelemetry. Null disables the layer.                                                      |
| `vpc_enabled`, `vpc_id`, `subnet_ids`                                                     | Execution in the VPC.                                                                        |
| `secret_arns`, `secrets_kms_key_arns`, `task_policies`                                    | Additional permissions.                                                                      |

## Outputs

`function_name`, `function_arn`, `role_arn`, `role_name`, `security_group_id`, `log_group_name`, `async_dlq_arn`, `kms_key_arn`, `event_source_mapping_uuid`.

## Notes

- The visibility timeout of the source queue must be at least six times `timeout`; the messaging topology declares it.
- The handler (`lambda.ts`) must return `batchItemFailures` with the identifiers of the failed messages.
- The ADOT layer depends on the region and the architecture: confirm the current ARN before using it.
- The KMS key is the module's unless you pass `kms_key_arn`; its policy must allow CloudWatch Logs and SQS. The `service` stack passes the environment's compute CMK (`compute_logs_kms_key_arn` from `platform`).
