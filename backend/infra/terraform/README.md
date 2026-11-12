# Infraestructura Terraform

Este directorio contiene la infraestructura AWS de la plataforma: la raíz `platform` y sus módulos.

## Estructura

```
infra/terraform/
├── modules/
│   ├── network/        VPC /16, subredes /22 públicas, privadas y de datos, NAT opcional, endpoints de VPC y flow logs
│   ├── rds-postgres/   RDS PostgreSQL 17 con CMK y parámetros propios, usuarios de servicio con rotación, RDS Proxy de escritura y de lectura
│   ├── valkey/         ElastiCache for Valkey serverless con CMK, TLS y autenticación IAM
│   ├── messaging/      Tópicos SNS, colas SQS, DLQ, suscripciones, KMS y alarmas
│   ├── ecs-cluster/    Clúster ECS Fargate con Container Insights y ECS Exec auditado
│   ├── alb/            ALB público para la API y Socket.IO/SSE
│   ├── observability/  OpenObserve en Fargate con ALB interno
│   ├── cloudfront-waf/ CloudFront (web Flutter y API) con WAFv2
│   ├── files-bucket/   Bucket S3 de archivos de usuarios
│   ├── ses/            Identidad SES, configuration sets y tópico de eventos
│   ├── service-fargate/ Microservicio Fargate (API o worker)
│   └── service-lambda/ Consumidor Lambda de una cola SQS
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

## Servicios

La raíz instancia los módulos de servicio desde la variable `services` (mapa, clave = nombre). Agregar un microservicio es una entrada en el tfvars; no hay que tocar el código de la raíz.

- `kind = "fargate"`: con `path_patterns` o `host_headers` es una API detrás del ALB; sin ellos es un worker que puede escalar por cola (`scale_on_queue`, con `min_capacity = 0` se apaga con la cola vacía; `spot = true` usa FARGATE_SPOT).
- `kind = "lambda"`: consumidor de `queue` (handler con `filename` o `s3_bucket` y `s3_key`).
- `queue`: cola de la topología o `ses-events`. `send_queues` y `publish_topics` dan permiso de envío y publicación. `db_user`, `valkey_user`, `files_access` y `ses_send` generan variables de entorno y políticas del rol; `task_policies` agrega las propias.
- Cada servicio recibe `DB_PROXY_HOST`, `DB_READER_HOST`, `VALKEY_HOST`, `VALKEY_PORT` y, según corresponda, `DB_CREDENTIALS` (secreto del usuario), `VALKEY_USER`, `FILES_BUCKET` y `QUEUE_URL`.
- La raíz abre en el security group del RDS Proxy (escritura y lectura) y de Valkey el acceso desde el security group de cada servicio. Los servicios abren su propia salida: HTTPS y TCP dentro de la VPC (módulos de servicio).
- Telemetría: con `observability_root_user_email` se despliega OpenObserve y cada servicio exporta por OTLP; sin él no se exporta.

## Entrada pública

Todo es opcional y se activa con variables; con los valores por defecto no se crea.

- `alb_certificate_arn` crea el ALB público. Los servicios con rutas cuelgan de su listener HTTPS. `alb_hostname` es el nombre del ALB: origen de CloudFront para la API y entrada directa de Socket.IO y SSE.
- `cloudfront_certificate_arn` (ACM en us-east-1, por el alias de provider `aws.us_east_1`) crea CloudFront con WAF para la web (`web_aliases`) y la API (`api_aliases`, origen `alb_hostname`).
- Con la API tras CloudFront, la raíz genera un secreto (`random_password`, queda en el estado) o usa `origin_verify_header_value`, y por cada servicio con rutas agrega dos reglas en el ALB: con `X-Origin-Verify` reenvía al servicio y sin él responde 403. Los servicios de tiempo real usan `origin_verify = false`.
- `route53_zone_id` crea los registros alias de CloudFront y del ALB y los de SES. Sin él, publícalos tú (`ses_dns_records` lista los de SES).
- `ses_domain` crea SES y una cola `<prefijo>-ses-events` (con DLQ) suscrita al tópico de eventos, para el seguimiento de correo. Se consume como `queue = "ses-events"`.
- El bucket de archivos se crea si hay orígenes CORS (`files_cors_allowed_origins` o `web_aliases`).

## Pendiente

Las raíces de servicio por separado (`services/<nombre>`) de la fase F12 quedan como alternativa a `var.services`; se conectan a `platform` mediante `clients_security_group_id`.
