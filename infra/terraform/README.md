# Infraestructura Terraform

Este directorio contiene la infraestructura AWS de la plataforma: la raíz `platform` y sus módulos. Las raíces de servicio llegan en la fase F12.

## Estructura

```
infra/terraform/
├── modules/
│   ├── network/        VPC /16, subredes /22 públicas y privadas, endpoints de VPC
│   ├── rds-postgres/   RDS PostgreSQL 17, réplicas de lectura, RDS Proxy y secreto administrado
│   ├── valkey/         ElastiCache for Valkey serverless
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

El archivo `examples/topology.example.json` sirve para validar y probar. Cada entorno apunta a la salida real con `topology_file`, como ruta absoluta o relativa a `platform/`.

## Requisitos

- Terraform 1.10 o superior, con el provider de AWS `>= 6.0, < 7.0`.
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

- No hay NAT gateway. Las subredes privadas salen a los servicios de AWS por endpoints de VPC: S3 por gateway, y SQS, SNS, Secrets Manager, ECR (api y dkr), CloudWatch Logs, STS, KMS y CloudWatch por interfaz.
- Terraform quita la regla de salida por defecto de los security groups. Cada salida se declara como regla explícita.
- Las aplicaciones escriben por el RDS Proxy. Las réplicas de lectura existen, pero el proxy no las enruta todavía.
- La contraseña maestra la genera RDS y la guarda en Secrets Manager. Terraform no maneja secretos en claro.
- Tópicos, colas y DLQ se cifran con una clave KMS administrada por el cliente, con rotación anual.
- Cada DLQ tiene una alarma cuando hay mensajes visibles. Con `alarm_topic_arn` la alarma notifica a un tópico SNS.
- `db_deletion_protection` está activo y el snapshot final se crea salvo que `db_skip_final_snapshot` sea `true`. Desactívalos solo en entornos desechables.

## Pendiente

Las raíces de servicio (`services/<nombre>`) con Lambda de la API, workers Fargate y consumidores llegan en la fase F12. Se conectan a `platform` mediante `clients_security_group_id`.
