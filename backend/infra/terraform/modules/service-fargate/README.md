# Módulo service-fargate

Un microservicio en Fargate: API con tráfico entrante detrás del ALB, o worker sin tráfico que escala por la profundidad de una cola.

## Qué crea

- Definición de tarea (ARM64 por defecto) con variables de entorno, secretos de Secrets Manager por ARN y logs en un log group cifrado con KMS.
- OpenTelemetry: `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` y `OTEL_EXPORTER_OTLP_*`. Con `otel_collector_sidecar = true` (por defecto) corre el collector ADOT como sidecar no esencial: la aplicación exporta a `localhost:4318` y el collector reenvía a OpenObserve con la cabecera de autorización del secreto.
- Servicio ECS con circuit breaker y rollback, `initProcessEnabled` y ECS Exec opcional.
- Con `enable_load_balancer`: target group sin stickiness, regla del listener por ruta o host, entrada del security group del servicio desde el ALB y la salida correspondiente en el security group del ALB.
- Security group con salida solo HTTPS. El acceso a RDS Proxy, réplicas, Valkey y OpenObserve llega con `additional_security_group_ids` (security group de clientes del stack data), con reglas hacia cada destino.
- Roles: ejecución (lee solo los secretos declarados y descifra con las claves indicadas) y tarea (políticas en línea desde `task_policies`).
- Autoescalado: CPU (y memoria) por seguimiento de objetivo, y por cola con pasos desde cero tareas.

## Entradas principales

| Variable                                                                                                                       | Descripción                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `name_prefix`, `service_name`, `environment`                                                                                   | Nombres y entorno.                                                                                                              |
| `cluster_arn`, `cluster_name`                                                                                                  | Salidas de `ecs-cluster`.                                                                                                       |
| `vpc_id`, `subnet_ids`                                                                                                         | Red privada.                                                                                                                    |
| `image`, `command`, `container_port`, `cpu`, `memory`                                                                          | Contenedor y tamaño.                                                                                                            |
| `environment_variables`, `secrets`                                                                                             | Entorno sin secretos y mapa nombre a ARN de secreto (con clave JSON opcional).                                                  |
| `otlp_endpoint`, `otlp_authorization_secret`                                                                                   | Salidas `otlp_http_endpoint` y `otlp_authorization_value_from` de `observability`.                                              |
| `enable_load_balancer`, `alb_listener_arn`, `alb_security_group_id`, `path_patterns`, `host_headers`, `listener_rule_priority` | Integración con el ALB.                                                                                                         |
| `min_capacity`, `max_capacity`, `cpu_target_percent`, `memory_target_percent`                                                  | Autoescalado por métricas.                                                                                                      |
| `sqs_scaling`                                                                                                                  | `queue_name`, `messages_per_task`, `steps`: autoescalado por cola. Con `min_capacity = 0` el worker se apaga con la cola vacía. |
| `capacity_provider_strategy`                                                                                                   | `FARGATE` o `FARGATE_SPOT` (workers tolerantes a interrupciones).                                                               |
| `task_policies`                                                                                                                | Mapa nombre a JSON de políticas IAM (SQS, S3, SES, etc.).                                                                       |

## Salidas

`service_name`, `service_arn`, `task_definition_arn`, `task_role_arn`, `task_role_name`, `execution_role_arn`, `security_group_id`, `target_group_arn`, `target_group_arn_suffix`, `log_group_name`, `autoscaling_resource_id`.

## Notas

- El escalado por cola usa dos alarmas: sube con los mensajes visibles y baja al mínimo cuando visibles más en proceso llegan a cero durante `scale_in_periods` minutos. En workers, pon `cpu_target_percent = null` para que la política de CPU no compita con la de cola.
- La clave KMS de logs es la del módulo salvo que pases `kms_key_arn`. La clave de `ecs-cluster` sirve si `name_prefix` coincide, porque su política cubre `/ecs/<name_prefix>/*`.
- Sin NAT, la tarea llega a AWS por endpoints de VPC. Las llamadas a internet (Claude API, APNs, FCM, pagos) necesitan una ruta de salida que define `network`.
- La imagen del collector tiene una versión por defecto que debes revisar y fijar.
