# Infraestructura Terraform

Este directorio contiene la infraestructura AWS de la plataforma: la raíz `platform` y sus módulos. Las raíces de servicio llegan en la fase F12.

## Estructura

```
infra/terraform/
├── modules/
│   ├── network/        VPC /16, subredes /22 públicas, privadas y de datos, NAT opcional, endpoints de VPC y flow logs
│   ├── rds-postgres/   RDS PostgreSQL 17 con CMK y parámetros propios, usuarios de servicio con rotación, RDS Proxy de escritura y de lectura
│   ├── valkey/         ElastiCache for Valkey serverless con CMK, TLS y autenticación IAM
│   └── messaging/      Tópicos SNS, colas SQS, DLQ, suscripciones, KMS y alarmas
├── platform/           Raíz de una región: compone los módulos
│   └── environments/   Valores por entorno (dev.tfvars, prod.tfvars)
└── examples/           Ejemplo de topología de mensajería
```

## Una raíz por región

Cada región tiene su propia raíz `platform` y su estado en S3. El estado de `dev` no comparte archivo con `prod`.

La primera versión despliega una región. Agregar otra es desplegar su raíz con el mismo código y otro `tfvars`.

## Topología de mensajería

El módulo `messaging` lee el JSON que exporta `libs/platform/messaging`. Su contrato:

- `topics`: `name` y `fifo`.
- `queues`: `name`, `fifo`, `visibilityTimeoutSeconds`, `maxAttempts`, `dlq` (siempre presente con `name`, `maxReceiveCount` y `retentionSeconds`) y `subscriptions` con `topic` y `filterTypes`.
- `routes`: `type` (tipo de mensaje), `kind` (`event` o `command`), `target` y `targetKind` (`topic` o `queue`).

Los filtros de suscripción leen el campo `type` del cuerpo del mensaje CloudEvents. Una lista `filterTypes` vacía o nula significa sin filtro.

Terraform valida antes de crear recursos:

- Cada suscripción apunta a un tópico declarado.
- Cada ruta cumple `event` con `topic` y `command` con `queue`, y su destino existe.
- `retentionSeconds` no supera 14 días.
- Los nombres finales de colas y DLQ, con prefijo y `.fifo`, no superan 80 caracteres.

El archivo `examples/topology.example.json` solo sirve para validar y para dev. `topology_file` no tiene valor por defecto: prod apunta a la topología real que exporta `backend/libs/platform/messaging`, como ruta absoluta o relativa a `platform/`.

## Requisitos

- Terraform 1.11 (atributos de solo escritura y recursos efímeros) o superior, con el provider de AWS `>= 6.0, < 7.0`.
- Credenciales AWS del entorno. El pipeline usa OIDC con GitHub Actions.
- Un bucket S3 para el estado, con versionado activo.

## Comandos

Ejecuta los comandos dentro de `platform/`.

Inicializa con el backend del entorno. El bucket, la clave y la región se pasan por parámetro:

```bash
terraform init \
  -backend-config="bucket=<bucket-de-estado>" \
  -backend-config="key=<region>/<entorno>/platform.tfstate" \
  -backend-config="region=<region>"
```

Revisa los cambios con el tfvars del entorno:

```bash
terraform plan -var-file=environments/prod.tfvars
```

Aplica solo después de revisar el plan:

```bash
terraform apply -var-file=environments/prod.tfvars
```

Para validar sin tocar AWS ni el backend:

```bash
terraform init -backend=false
terraform validate
```

Desde `infra/terraform/` puedes comprobar el formato con `terraform fmt -recursive -check .`.

## Decisiones

- Salida a Internet: la variable `egress` (`none`, `single_nat` en dev, `per_az_nat` en prod) pone NAT gateways solo para las subredes privadas de aplicación. Las subredes de datos (RDS, proxies, Valkey) no tienen ruta a Internet. El tráfico a AWS sigue por endpoints de VPC: S3 y DynamoDB por gateway; SQS, SNS, Secrets Manager, ECR (api y dkr), CloudWatch Logs, STS, KMS y CloudWatch por interfaz. Ver [ADR 0016](../../../docs/adr/0016-egress-de-red.md).
- Los flow logs de la VPC van a CloudWatch Logs con CMK y retención configurable (`flow_logs_retention_days`, `flow_logs_traffic_type`).
- Terraform quita la regla de salida por defecto de los security groups. Cada salida se declara como regla explícita.
- Lectura: RDS Proxy no tiene endpoint lector fuera de Aurora. Cada réplica se registra como destino único de su propio proxy (`rds_reader_endpoints`); `reader_endpoint` es el de la primera. Con más de una réplica el cliente reparte entre los endpoints. Las apps escriben por `rds_proxy_endpoint` y leen por `reader_endpoint`.
- Las apps nunca usan el usuario maestro. `db_service_users` crea un rol por servicio con esquema propio y un secreto en Secrets Manager con rotación (función oficial de AWS, usuario único). Una Lambda de bootstrap dentro de la VPC crea los roles; la contraseña inicial es efímera y no llega al estado. El campo `host` del secreto apunta a la instancia directa porque la rotación no puede pasar por el proxy: las apps toman el host de `rds_proxy_endpoint` o `reader_endpoint`. El maestro solo sirve para administración.
- Grupo de parámetros propio: `rds.logical_replication = 1` (traslados de shard sin corte, pide reinicio la primera vez), `log_min_duration_statement`, `pg_stat_statements` y TLS obligatorio. Una CMK cifra el almacenamiento, Performance Insights y los secretos.
- Valkey exige TLS, se cifra en reposo con CMK y autentica por IAM: el usuario `default` queda deshabilitado y cada servicio tiene su usuario (`valkey_users`). El rol del servicio necesita `elasticache:Connect` sobre `valkey_connect_resource_arns`.
- Alarmas: `alarm_email` crea un tópico SNS cifrado, o `alarm_topic_arn` usa uno existente. En prod uno de los dos es obligatorio. Reciben las alarmas de DLQ (mensajes visibles y edad), de colas (consumidor detenido) y de RDS (CPU, disco, memoria y retraso de réplica).
- Tópicos, colas y DLQ se cifran con una clave KMS administrada por el cliente, con rotación anual.
- Cada DLQ tiene una alarma cuando hay mensajes visibles. Con `alarm_topic_arn` la alarma notifica a un tópico SNS.
- `db_deletion_protection` está activo y el snapshot final se crea salvo que `db_skip_final_snapshot` sea `true`. Desactívalos solo en entornos desechables.

## Pendiente

Las raíces de servicio (`services/<nombre>`) con Lambda de la API, workers Fargate y consumidores llegan en la fase F12. Se conectan a `platform` mediante `clients_security_group_id`.
