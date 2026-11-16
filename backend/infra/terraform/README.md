# Infraestructura Terraform

Infraestructura AWS de la plataforma, organizada en módulos, stacks con estado propio y valores por ambiente. La decisión está en el [ADR 0020](../../../docs/adr/0020-terraform-por-stacks-y-runtime-por-servicio.md).

## Estructura

```
backend/infra/
├── terraform/
│   ├── modules/             Piezas reutilizables, sin backend ni proveedor (las CMK, con kms-key)
│   ├── stacks/              Raíces con estado propio
│   │   ├── network/         VPC, subredes, NAT, endpoints y flow logs (ADR 0016)
│   │   ├── platform/        Alarmas y presupuesto, ECS, OpenObserve, API HTTP, ALB, archivos, SES y la CMK de logs del cómputo
│   │   ├── data/            RDS con bases por shard y catálogo, RDS Proxy, réplicas y Valkey
│   │   ├── messaging/       Tópicos, colas y DLQ de topology.json y la cola de eventos de SES
│   │   ├── edge/            CloudFront con WAF y DNS
│   │   └── service/         Un microservicio: se instancia una vez por servicio
│   ├── environments/        <ambiente>/<stack>/{backend.tfvars,terraform.tfvars}
│   │   └── <ambiente>/services/<servicio>/   Valores de cada servicio
│   ├── examples/            Un uso mínimo de cada módulo, validado en CI
│   ├── topology.json        Topología exportada por contracts-export (build-topology.ts)
│   ├── .terraform-version   Versión de Terraform de CI
│   ├── .tflint-version      Versión de tflint de CI
│   └── .tflint.hcl          Reglas de tflint (incluye el ruleset de AWS)
├── scripts/                 deploy-aws.sh, local.sh, tf-validate.mjs, check_vendor.py y fetch-rds-ca-bundle.sh
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

Permisos por parte (mínimo privilegio): la API, los workers y los consumidores publican y envían según `producers` de la topología; el tiempo real solo si `realtime.publish = true`. Cada worker consume solo su cola y cada consumidor la suya (la da el módulo `service-lambda`); la API y el tiempo real no consumen. `files_access` y `ses_send` se piden en cada parte (`api.files_access`, `workers.<x>.ses_send`...). `valkey_access` y `database_access` valen para todo el servicio, igual que `task_policies`.

Variables de entorno: son el contrato con los esquemas de configuración de `@platform/*` y `backend/.env.example` usa los mismos nombres. `tests/service.tftest.hcl` fija la lista exacta, así un cambio de un lado rompe la prueba.

| Variable                                                                        | Cuándo                     | Contenido                                                                                                       |
| ------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SERVICE_NAME`, `DEPLOY_ENVIRONMENT`, `MESSAGING_NAME_PREFIX`, `AWS_ACCOUNT_ID` | siempre                    | Servicio, ambiente, prefijo de tópicos y colas, y cuenta (para armar ARN sin STS).                              |
| `AWS_REGION`                                                                    | Fargate                    | Región. En Lambda la pone el runtime.                                                                           |
| `DB_PROXY_HOST`, `DB_READER_HOSTS`, `DB_PORT`, `DB_DATABASES`                   | `database_access`          | RDS Proxy, réplicas separadas por coma, puerto y JSON con `shards` y `catalog`.                                 |
| `DB_CREDENTIALS` / `DB_SECRET_ARN`                                              | `database_access`          | Fargate recibe el secreto (JSON con `username` y `password`) por `valueFrom`; Lambda, su ARN.                   |
| `VALKEY_HOST`, `VALKEY_PORT`, `VALKEY_TLS`, `VALKEY_USER`                       | `valkey_access`            | Endpoint serverless, TLS (`true`) y usuario IAM del servicio.                                                   |
| `VALKEY_AUTH`, `VALKEY_CACHE_NAME`                                              | `valkey_access`            | `iam-serverless`: el cliente firma un token IAM (SigV4, 15 minutos) para la caché `VALKEY_CACHE_NAME`.          |
| `VALKEY_KEY_PREFIX`                                                             | `valkey_access`            | Nombre del servicio. Los adaptadores escriben `<prefijo>:...` en llaves y canales, lo único que permite la ACL. |
| `FILES_BUCKET`                                                                  | `files_access` de la parte | Bucket de archivos.                                                                                             |
| `QUEUE_URL`                                                                     | workers                    | URL de su cola.                                                                                                 |

`environment_variables` agrega variables propias, sin poder reemplazar las de la tabla. El pipeline pasa los artefactos con `TF_VAR_image` y `TF_VAR_lambda_package`. Las Lambdas usan el runtime de la versión mayor de `.nvmrc` (`nodejs24.x`); `service-lambda` rechaza otra en el plan.

## Datos

- Una instancia RDS PostgreSQL 17 por región. El bootstrap (Lambda en la VPC) crea un rol por servicio con su secreto rotado, una base por shard (`<servicio>_shard_<n>`, dueño el servicio) y la base `catalog` (dueño `catalog_owner`), todas con la extensión `vector`, igual que `backend/infra/local/postgres/init.sql`. `catalog = "owner"` hace al servicio miembro de `catalog_owner` (migra el catálogo con `SET ROLE catalog_owner`) y `"read"`, de `catalog_reader`. Quitar una base de la lista no la borra.
- Escritura por RDS Proxy. Lectura directa a las réplicas: fuera de Aurora, RDS Proxy solo admite la instancia escritora. Las réplicas tienen su propio security group.
- La Lambda de bootstrap carga sus dependencias de `vendor/` (Lambda solo pone `/var/task` en `sys.path`). Las versiones están en `requirements.txt`, que también leen OSV-Scanner y Renovate. CI corre `backend/infra/scripts/check_vendor.py`, que falla si `vendor/` no tiene exactamente esas versiones; una subida de Renovate necesita `vendor/` regenerado con el comando del encabezado de `requirements.txt`.
- El bootstrap entra como usuario maestro y crea roles con contraseña, así que verifica el certificado de RDS (cadena y nombre) con `rds-ca-bundle.pem`, el bundle público de AWS junto al handler. `backend/infra/scripts/fetch-rds-ca-bundle.sh` lo descarga; se confirma en git y se renueva cuando AWS publica CA nuevas. Sin él, el bootstrap se niega a conectarse y el apply de `data` falla en la invocación.
- La rotación usa la función oficial de AWS con `kmsKeyArn`, para descifrar los secretos cifrados con la CMK.
- Logs de PostgreSQL, del bootstrap y de la rotación con retención (`log_retention_days`) y CMK.
- Valkey 8 serverless (los comandos `BF.*` de Bloom llegan en 8.1): un usuario IAM por servicio con ACL `on ~<servicio>:* &<servicio>:* +@all -@dangerous`. Los adaptadores exigen el prefijo `VALKEY_KEY_PREFIX` y escriben `<servicio>:...` en llaves y canales. `valkey_acl_overrides` permite otra ACL, revisada.
- Los servicios salen solo por HTTPS. El security group de clientes (`clients_security_group_id`) abre la salida exacta hacia RDS Proxy, las réplicas, Valkey y OpenObserve, y es el único origen que esos destinos aceptan.

## Topología de mensajería

El stack `messaging` lee `topology.json`, que exporta `backend/tools/contracts-export` y CI verifica (`contracts-export:check`). Su contrato:

- `topics`: `name`, `fifo` y, opcionales, `owner` y `producers`.
- `queues`: `name`, `fifo`, `visibilityTimeoutSeconds`, `maxAttempts`, `dlq` (`name`, `maxReceiveCount`, `retentionSeconds`), `subscriptions` (`topic`, `filterTypes`) y, opcionales, `consumer` y `producers`.
- `routes`: `type`, `kind` (`event` o `command`), `target` y `targetKind` (`topic` o `queue`).

Los filtros de suscripción leen el campo `type` del cuerpo CloudEvents; una lista vacía es sin filtro. Terraform valida que cada suscripción y cada ruta apunten a algo declarado, que `retentionSeconds` no supere 14 días y que los nombres finales no superen 80 caracteres.

## Entrada pública

- `platform` crea la API HTTP con un autorizador que exige `X-Origin-Verify`. El valor se genera sin pasar por el estado de `platform` y se guarda en Secrets Manager; `edge` lo lee y lo envía desde CloudFront, así que queda en el estado de `edge` (un encabezado de origen de CloudFront no admite valores efímeros). Por eso los buckets de estado van cifrados y con acceso restringido.
- Rotación sin corte: sube `origin_verify_secret_version` del módulo `http-api`, aplica `platform`, espera al menos 5 minutos y aplica `edge`. El valor anterior pasa a `AWSPREVIOUS` y el autorizador acepta los dos; además recarga el secreto cada 5 minutos, así ningún contenedor caliente se queda con un valor viejo. No rotes otra vez antes de aplicar `edge`.
- `edge` crea CloudFront con WAF para la web (`web_aliases`) y la API (`api_aliases`). Hacia API Gateway no reenvía el `Host` del cliente (política `AllViewerExceptHostHeader`), pero sí los encabezados de geolocalización.
- Tiempo real: el ALB público entra directo, con `realtime_hostname` en Route 53.

## Alarmas y costos

`platform` crea el tópico de alarmas con `alarm_email` (o usa `alarm_topic_arn`) y un presupuesto con `monthly_budget`. En staging y prod el destino es obligatorio y `alarm_email` rechaza valores de ejemplo (`REEMPLAZAR`, `example.com`).

## Comandos

Requisitos: Terraform de `.terraform-version` (o `>= 1.11`), credenciales de AWS (OIDC en CI) y un bucket de estado por ambiente con versionado, creado una vez: `node-template-<ambiente>-tfstate`.

```bash
ENV=dev backend/infra/scripts/deploy-aws.sh plan data               # guarda el plan de un stack
ENV=dev backend/infra/scripts/deploy-aws.sh apply data              # aplica ese plan, sin volver a planear
ENV=dev backend/infra/scripts/deploy-aws.sh plan service identity   # un servicio
ENV=dev backend/infra/scripts/deploy-aws.sh destroy                 # en orden inverso
```

`plan` toma el candado del estado (espera hasta `LOCK_TIMEOUT`, 5 minutos) y guarda el plan en `backend/infra/terraform/.plans/<ambiente>/`; `apply` aplica exactamente ese archivo, así el pipeline aplica lo que se revisó. Si el estado cambió después del plan, Terraform lo rechaza y hay que volver a planear. Como un stack lee las salidas de los anteriores, con `all` conviene planear y aplicar stack por stack en orden.

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
python3 -B -I -m unittest discover -s backend/infra/terraform/modules/rds-postgres/lambda/db_bootstrap
python3 -B -I -m unittest discover -s backend/infra/terraform/modules/http-api/authorizer
python3 -B -I backend/infra/scripts/check_vendor.py backend/infra/terraform/modules/rds-postgres/lambda/db_bootstrap
```

## Pipeline de despliegue

Los workflows `deploy.yml`, `publish-web.yml` y `publish-mobile.yml` entran a AWS por OIDC. No hay claves de larga vida: cada job asume un rol con `aws-actions/configure-aws-credentials`. El módulo `modules/oidc-github` crea los roles y el bucket de artefactos, y el stack `platform` lo cablea cuando `github_repository` está configurado (si es `null`, el pipeline queda apagado).

Roles y variables del repositorio de GitHub. Cada GitHub environment, con el mismo nombre que el ambiente (`dev`, `staging`, `prod`), guarda estas variables:

| Variable                    | Uso                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `vars.AWS_DEPLOY_ROLE_ARN`  | Rol de Terraform y de lectura del estado, de los stacks y de cada servicio.                        |
| `vars.AWS_PUBLISH_ROLE_ARN` | Rol que sube imágenes a ECR y artefactos al bucket de artefactos.                                  |
| `vars.AWS_WEB_ROLE_ARN`     | Rol que publica la web e invalida CloudFront.                                                      |
| `vars.AWS_REGION`           | Región de AWS del ambiente.                                                                        |
| `vars.NAME_PREFIX`          | Prefijo de nombres, por ejemplo `node-template-dev`. Lo usa la web.                                |
| `vars.ARTIFACTS_BUCKET`     | Bucket de artefactos. Lo lee `publish-mobile.yml`; el pipeline de servicios lo toma de `platform`. |
| `vars.DEPLOY_RUNNER`        | Opcional. Etiqueta de un runner propio dentro de la VPC; sin ella se usa `ubuntu-latest`.          |

Orden por servicio. Los servicios se descubren recorriendo `environments/<ambiente>/services/*`: cada carpeta con `terraform.tfvars` y `backend.tfvars` es un servicio, y el workflow no tiene una lista fija. Para cada uno se hacen cuatro pasos en orden: publicar el artefacto (imagen con etiqueta `sha-<commit>` o paquete de Lambda en S3), migrar la base, planear y aplicar el stack `service`. El artefacto sale antes porque el `apply` necesita `TF_VAR_image` o `TF_VAR_lambda_package`. Antes de los servicios, el job de stacks aplica `network`, `platform`, `data`, `messaging` y `edge`, en ese orden, planeando y aplicando cada uno antes del siguiente porque lee sus salidas.

Migraciones. Las migraciones corren en el runner del job y necesitan alcanzar la base a través de RDS Proxy. Por eso conviene un runner dentro de la VPC (`vars.DEPLOY_RUNNER`), no uno hospedado por GitHub. `migrate-service.sh` lee la base y las credenciales del servicio desde las salidas del stack `data` y las enmascara en los logs.

Aplicación móvil. El pipeline solo compila el `.aab` y lo sube al bucket de artefactos bajo el commit. La subida a las tiendas y la firma de release exigen credenciales del titular de la cuenta y no se automatizan.

Probar los scripts sin tocar AWS. Con `DRY_RUN=1` cada comando se imprime con el prefijo `+ ` en lugar de ejecutarse, y las lecturas devuelven `<dry-run>`. Para probar contra el fixture de servicios:

```bash
DRY_RUN=1 TF_ROOT=backend/infra/scripts/__tests__/utils/fixtures/terraform GIT_SHA=abc1234 \
  ARTIFACTS_BUCKET=fixture-artifacts ECR_PREFIX=fixture-dev AWS_REGION=us-east-1 \
  backend/infra/scripts/deploy-service.sh dev fixture-mixed
node --test backend/infra/scripts/__tests__/*.test.mjs
```

## Decisiones

- Salida a Internet: `egress` (`none`, `single_nat` en dev, `per_az_nat` en staging y prod) pone NAT solo para las subredes privadas de aplicación. Las de datos no tienen ruta a Internet. Ver [ADR 0016](../../../docs/adr/0016-egress-de-red.md).
- Terraform quita la regla de salida por defecto de los security groups: cada salida es explícita.
- Las excepciones de Trivy (`trivy:ignore`) van junto al recurso con su motivo: salida HTTPS de los servicios por NAT, ALB público de tiempo real, HTTP del ALB interno detrás del VPC link y cifrado SSE-S3 de los access logs del ALB.
- `db_deletion_protection` está activo y el snapshot final se crea salvo `db_skip_final_snapshot = true`. Desactívalos solo en ambientes desechables.
- Claves KMS: todas salen del módulo `kms-key`, con la misma política base. Los logs de todos los servicios (Fargate y Lambda) comparten una CMK por ambiente del stack `platform`; los roles ya limitan qué log group escribe cada componente. RDS, mensajería, Valkey, archivos y los secretos conservan su propia CMK.
