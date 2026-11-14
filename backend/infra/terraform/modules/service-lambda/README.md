# Módulo service-lambda

Una Lambda en arm64: consumidora de una cola SQS con respuesta parcial de lotes, o API detrás de API Gateway HTTP (`queue_arn = null`, rutas con el módulo `api-routes`).

## Qué crea

- Función Lambda arm64 con paquete local o en S3, JSON logging, variables de entorno cifradas con KMS y X-Ray activo.
- Mapeo de eventos SQS con `ReportBatchItemFailures`: solo los mensajes que fallan vuelven a la cola y, tras agotar los reintentos, van a su DLQ (definida en `messaging`). Admite `maximum_concurrency`, ventana de agrupación y filtros.
- Concurrencia reservada opcional (`reserved_concurrent_executions`).
- Cola de mensajes fallidos para invocaciones asíncronas (`dead_letter_config`), cifrada con KMS, con alarma.
- Capa de OpenTelemetry (ADOT) por `otel_layer_arn`: el módulo fija `AWS_LAMBDA_EXEC_WRAPPER`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` y la configuración del collector que reenvía a OpenObserve.
- Log group con retención y KMS, rol de mínimo privilegio y alarma de errores.
- Opcional: ejecución en la VPC con su propio security group (`vpc_enabled`), que solo sale por HTTPS. El acceso a RDS Proxy, réplicas, Valkey y OpenObserve llega con `additional_security_group_ids` (security group de clientes del stack data).

## Entradas principales

| Variable                                                                                  | Descripción                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `name_prefix`, `function_name`, `environment`                                             | Nombres y entorno.                     |
| `handler`, `runtime`                                                                      | Handler y runtime (`nodejs22.x`).      |
| `filename` o `s3_bucket` con `s3_key`, `source_code_hash`                                 | Paquete.                               |
| `queue_arn`, `queue_kms_key_arn`                                                          | Cola de `messaging` y su clave KMS.    |
| `batch_size`, `maximum_batching_window_seconds`, `maximum_concurrency`, `filter_patterns` | Consumo.                               |
| `reserved_concurrent_executions`                                                          | Protege la base de datos de picos.     |
| `otel_layer_arn`, `otel_collector_config_uri`                                             | OpenTelemetry. Null desactiva la capa. |
| `vpc_enabled`, `vpc_id`, `subnet_ids`                                                     | Ejecución en la VPC.                   |
| `secret_arns`, `secrets_kms_key_arns`, `task_policies`                                    | Permisos adicionales.                  |

## Salidas

`function_name`, `function_arn`, `role_arn`, `role_name`, `security_group_id`, `log_group_name`, `async_dlq_arn`, `kms_key_arn`, `event_source_mapping_uuid`.

## Notas

- La visibilidad de la cola de origen debe ser al menos seis veces `timeout`; lo declara la topología de mensajería.
- El handler (`lambda.ts`) debe devolver `batchItemFailures` con los identificadores de los mensajes fallidos.
- La capa ADOT depende de la región y la arquitectura: confirma el ARN vigente antes de usarlo.
- La clave KMS es del módulo salvo que pases `kms_key_arn`; su política debe permitir a CloudWatch Logs y a SQS.
