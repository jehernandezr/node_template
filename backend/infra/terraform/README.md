# Infraestructura Terraform

Infraestructura AWS de la plataforma, organizada en módulos, stacks con estado propio y valores por ambiente. La decisión está en el [ADR 0020](../../../docs/adr/0020-terraform-por-stacks-y-runtime-por-servicio.md).

## Estructura

```
backend/infra/
├── terraform/
│   ├── modules/             Piezas reutilizables, sin backend ni proveedor
│   ├── stacks/              Raíces con estado propio
│   │   ├── network/         VPC, subredes, NAT, endpoints y flow logs (ADR 0016)
│   │   ├── platform/        Alarmas y presupuesto, ECS, OpenObserve, API HTTP, ALB, archivos y SES
│   │   ├── data/            RDS con bases por shard y catálogo, RDS Proxy, réplicas y Valkey
│   │   ├── messaging/       Tópicos, colas y DLQ de topology.json y la cola de eventos de SES
│   │   ├── edge/            CloudFront con WAF y DNS
│   │   └── service/         Un microservicio: se instancia una vez por servicio
│   ├── environments/        <ambiente>/<stack>/{backend.tfvars,terraform.tfvars}
│   │   └── <ambiente>/services/<servicio>/   Valores de cada servicio
│   ├── examples/            Un uso mínimo de cada módulo, validado en CI
│   ├── topology.json        Topología exportada por contracts-export (Topology.toJSON())
│   ├── .terraform-version   Versión de Terraform de CI
│   ├── .tflint-version      Versión de tflint de CI
│   └── .tflint.hcl          Reglas de tflint (incluye el ruleset de AWS)
├── scripts/                 deploy-aws.sh, local.sh y tf-validate.mjs
└── local/                   init.sql de PostgreSQL, LocalStack y el OpenTelemetry Collector
```

Cada stack tiene:

- `config.tf`: versiones, proveedor y `backend "s3" {}` vacío. El bucket y la clave llegan de `backend.tfvars`.
- `variables_common.tf`: `region`, `environment`, `name_prefix`, `aws_endpoint_url` y etiquetas. Es idéntico en todos los stacks; `tf-validate.mjs` falla si difiere.
- `remote_state.tf`: lee los stacks anteriores en `<región>/<stack>/terraform.tfstate`.
- `tests/`: pruebas de `terraform test` con proveedores simulados, sin AWS.

## Stacks y orden

| Orden | Stack       | Lee                                | Ambientes                 |
| ----- | ----------- | ---------------------------------- | ------------------------- |
| 1     | `network`   |                                    | dev, staging, prod        |
| 2     | `platform`  | network                            | local, dev, staging, prod |
| 3     | `data`      | network, platform                  | dev, staging, prod        |
| 4     | `messaging` | platform                           | local, dev, staging, prod |
| 5     | `edge`      | platform                           | dev, staging, prod        |
| 6     | `service`   | network, platform, data, messaging | dev, staging, prod        |

Cada región tiene sus propios estados con el mismo código: la región forma parte de la clave.

## Servicios

Un servicio es una instancia del stack `service` con su propio estado. Para agregar uno, copia `stacks/service/example.tfvars` a `environments/<ambiente>/services/<servicio>/terraform.tfvars` y crea a su lado un `backend.tfvars` con `key = "<región>/services/<servicio>/terraform.tfstate"`. Además:

- Agrégalo a `db_services` y a `valkey_services` en el `terraform.tfvars` del stack `data`.
- Declara sus tópicos y colas en la topología. Los permisos de publicar, enviar y consumir salen de `producers` y `consumer` de `topology.json`; no se repiten en el `tfvars`.

Partes de un servicio:

- `api`: `runtime = "lambda"` (función con `lambda.ts` detrás de API Gateway HTTP) o `"fargate"` (contenedor con `main.ts` detrás del ALB interno, por el VPC link; requiere `fargate_api_enabled = true` en `platform` y un `listener_rule_priority` único). Las dos entran por la API HTTP compartida, detrás de CloudFront y su WAF. Cada prefijo de `route_prefixes` crea `ANY <prefijo>` y `ANY <prefijo>/{proxy+}`.
- `realtime`: Socket.IO y SSE, siempre en Fargate detrás del ALB público de `platform` (`realtime_alb_certificate_arn`).
- `workers`: Fargate con `worker.ts`, escala por la profundidad de su cola desde cero.
- `consumers`: Lambdas consumidoras de una cola, con fallos parciales por lote.

Variables de entorno que recibe cada parte: `SERVICE_NAME`, `DEPLOY_ENVIRONMENT`, `MESSAGING_NAME_PREFIX`; con `database_access`, `DB_PROXY_HOST`, `DB_READER_HOSTS` (réplicas separadas por coma), `DB_PORT`, `DB_DATABASES` (JSON con `shards` y `catalog`) y `DB_CREDENTIALS` (Fargate) o `DB_SECRET_ARN` (Lambda); con `valkey_access`, `VALKEY_HOST`, `VALKEY_PORT`, `VALKEY_USER` y `VALKEY_KEY_PREFIX`; con `files_access`, `FILES_BUCKET`; los workers, `QUEUE_URL`. El pipeline pasa los artefactos con `TF_VAR_image` y `TF_VAR_lambda_package`.

## Datos

- Una instancia RDS PostgreSQL 17 por región. El bootstrap (Lambda en la VPC) crea un rol por servicio con su secreto rotado, una base por shard (`<servicio>_shard_<n>`, dueño el servicio) y la base `catalog` (dueño `catalog_owner`), todas con la extensión `vector`, igual que `backend/infra/local/postgres/init.sql`. `catalog = "owner"` hace al servicio miembro de `catalog_owner` (migra el catálogo con `SET ROLE catalog_owner`) y `"read"`, de `catalog_reader`. Quitar una base de la lista no la borra.
- Escritura por RDS Proxy. Lectura directa a las réplicas: fuera de Aurora, RDS Proxy solo admite la instancia escritora. Las réplicas tienen su propio security group.
- La Lambda de bootstrap carga sus dependencias de `vendor/` (Lambda solo pone `/var/task` en `sys.path`). Las versiones están en `requirements.txt`, que también leen OSV-Scanner y Renovate. Para regenerar `vendor/`, sigue el comando del encabezado de ese archivo.
- La rotación usa la función oficial de AWS con `kmsKeyArn`, para descifrar los secretos cifrados con la CMK.
- Logs de PostgreSQL, del bootstrap y de la rotación con retención (`log_retention_days`) y CMK.
- Valkey: un usuario IAM por servicio con ACL `on ~<servicio>:* &<servicio>:* +@all -@dangerous`. La capa de caché debe anteponer el nombre del servicio a sus llaves. `valkey_acl_overrides` permite otra ACL, revisada.
- Los servicios salen solo por HTTPS. El security group de clientes (`clients_security_group_id`) abre la salida exacta hacia RDS Proxy, las réplicas, Valkey y OpenObserve, y es el único origen que esos destinos aceptan.

## Topología de mensajería

El stack `messaging` lee `topology.json`, que exporta `backend/tools/contracts-export` y CI verifica (`contracts-export:check`). Su contrato:

- `topics`: `name`, `fifo` y, opcionales, `owner` y `producers`.
- `queues`: `name`, `fifo`, `visibilityTimeoutSeconds`, `maxAttempts`, `dlq` (`name`, `maxReceiveCount`, `retentionSeconds`), `subscriptions` (`topic`, `filterTypes`) y, opcionales, `consumer` y `producers`.
- `routes`: `type`, `kind` (`event` o `command`), `target` y `targetKind` (`topic` o `queue`).

Los filtros de suscripción leen el campo `type` del cuerpo CloudEvents; una lista vacía es sin filtro. Terraform valida que cada suscripción y cada ruta apunten a algo declarado, que `retentionSeconds` no supere 14 días y que los nombres finales no superen 80 caracteres.

## Entrada pública

- `platform` crea la API HTTP con un autorizador que exige `X-Origin-Verify`. El valor se genera sin pasar por el estado de `platform` y se guarda en Secrets Manager; `edge` lo lee y lo envía desde CloudFront. Para rotarlo, sube `origin_verify_secret_version` del módulo `http-api` y aplica `platform` y `edge`.
- `edge` crea CloudFront con WAF para la web (`web_aliases`) y la API (`api_aliases`). Hacia API Gateway no reenvía el `Host` del cliente (política `AllViewerExceptHostHeader`), pero sí los encabezados de geolocalización.
- Tiempo real: el ALB público entra directo, con `realtime_hostname` en Route 53.

## Alarmas y costos

`platform` crea el tópico de alarmas con `alarm_email` (o usa `alarm_topic_arn`) y un presupuesto con `monthly_budget`. En staging y prod el destino es obligatorio y `alarm_email` rechaza valores de ejemplo (`REEMPLAZAR`, `example.com`).

## Comandos

Requisitos: Terraform de `.terraform-version` (o `>= 1.11`), credenciales de AWS (OIDC en CI) y un bucket de estado por ambiente con versionado, creado una vez: `node-template-<ambiente>-tfstate`.

```bash
ENV=dev backend/infra/scripts/deploy-aws.sh plan                    # todos los stacks, en orden
ENV=dev backend/infra/scripts/deploy-aws.sh apply data              # un stack
ENV=dev backend/infra/scripts/deploy-aws.sh plan service identity   # un servicio
ENV=dev backend/infra/scripts/deploy-aws.sh destroy                 # en orden inverso
```

Ambiente local (Docker y LocalStack):

```bash
backend/infra/scripts/local.sh up          # contenedores
backend/infra/scripts/local.sh tf apply    # platform y messaging contra LocalStack
backend/infra/scripts/local.sh reset       # borra contenedores y volúmenes
```

Al arrancar, LocalStack crea por sí solo los tópicos, colas, DLQ y suscripciones de `topology.json` con el prefijo `local` (`MESSAGING_NAME_PREFIX`), sin Terraform. El Terraform local usa el prefijo `node-template-local` para no chocar con ellos.

Validación sin AWS, igual que CI:

```bash
terraform -chdir=backend/infra/terraform fmt -check -recursive
node backend/infra/scripts/tf-validate.mjs
tflint --init --config "$PWD/backend/infra/terraform/.tflint.hcl"
tflint --chdir backend/infra/terraform --recursive --config "$PWD/backend/infra/terraform/.tflint.hcl"
```

## Decisiones

- Salida a Internet: `egress` (`none`, `single_nat` en dev, `per_az_nat` en staging y prod) pone NAT solo para las subredes privadas de aplicación. Las de datos no tienen ruta a Internet. Ver [ADR 0016](../../../docs/adr/0016-egress-de-red.md).
- Terraform quita la regla de salida por defecto de los security groups: cada salida es explícita.
- Las excepciones de Trivy (`trivy:ignore`) van junto al recurso con su motivo: salida HTTPS de los servicios por NAT, ALB público de tiempo real, HTTP del ALB interno detrás del VPC link y cifrado SSE-S3 de los access logs del ALB.
- `db_deletion_protection` está activo y el snapshot final se crea salvo `db_skip_final_snapshot = true`. Desactívalos solo en ambientes desechables.
