# Desarrollo local

Esta guía prepara el repositorio para trabajar desde la raíz con Nx y levanta la infraestructura local: PostgreSQL, Valkey, LocalStack, Mailpit, el OpenTelemetry Collector y OpenObserve.

## Prerrequisitos

- Node 24, la versión de [`.nvmrc`](../.nvmrc).
- pnpm mediante Corepack. Activa Corepack una vez con `corepack enable`; la versión sale del campo `packageManager` de [`package.json`](../package.json).
- Flutter, la versión de [`front/.flutter-version`](../front/.flutter-version).
- Docker con Docker Compose v2.
- Terraform, la versión de [`backend/infra/terraform/.terraform-version`](../backend/infra/terraform/.terraform-version), solo para cambios de infraestructura.

## Preparar el repositorio

Desde la raíz:

```bash
corepack enable
pnpm install                    # Nx, el backend y los hooks de git
cd front && flutter pub get     # el pub workspace del front
cd ..
```

Las tareas del front que corre Nx (`analyze`, `format-check` y `test`) usan `--no-pub`, así que necesitan el `flutter pub get` previo.

## Comandos de uso diario

Todos corren desde la raíz:

| Comando                                                              | Qué hace                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm nx affected -t lint test typecheck build analyze format-check` | Valida lo que cambió frente a `main`, igual que CI       |
| `pnpm nx format:check`                                               | Revisa el formato con Prettier                           |
| `pnpm nx test platform-saga`                                         | Prueba un proyecto del backend                           |
| `pnpm nx test front-shell_core`                                      | Prueba un paquete del front                              |
| `pnpm nx run contracts-export:export`                                | Exporta los contratos de `backend/libs/contracts` a JSON |
| `pnpm nx run contracts-export:check`                                 | Falla si el JSON exportado está desactualizado           |
| `pnpm nx show projects`                                              | Lista los proyectos del backend y del front              |
| `pnpm nx graph`                                                      | Abre el grafo de proyectos                               |

El Dart de los contratos se genera dentro de `front/`:

```bash
cd front
dart run contracts_gen           # regenera front/packages/contracts
dart run contracts_gen --check   # falla si el Dart generado está desactualizado
```

Para verificar que los microfrontends siguen diferidos en la web, igual que el job `web-deferred` de CI:

```bash
cd front/apps/web
flutter build web --release --source-maps
dart run ../../tools/check_deferred_chunks.dart
```

## Levantar la infraestructura

El stack local vive en `backend/`:

1. Entra a la carpeta con `cd backend`.
2. Copia las variables de entorno de las apps con `cp .env.example .env`. El archivo `.env` no se confirma en git.
3. Levanta los servicios con `docker compose up -d`, o desde la raíz con `backend/infra/scripts/local.sh up`, que espera a que todos queden sanos.
4. Revisa el estado con `docker compose ps`. Todos los servicios deben aparecer como `healthy`.

Los puertos se publican solo en `127.0.0.1`: nada queda expuesto a la red local. Las imágenes están fijadas por tag y digest, y Renovate las actualiza.

## Servicios y URLs

| Servicio                | Puerto      | Acceso                                                                                                                                                                              |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL              | 5432        | Imagen con pgvector. Credenciales de desarrollo en `backend/docker-compose.yml`. Bases: `catalog`, `identity_shard_0`, `identity_shard_1`, `tasks_shard_0`                          |
| Valkey                  | 6379        | `redis://localhost:6379`, con los módulos de Valkey (incluye los comandos `BF.*` de Bloom). No tiene interfaz web                                                                   |
| LocalStack              | 4566        | http://localhost:4566. Estado: http://localhost:4566/_localstack/health. Servicios: SQS, SNS, S3, Scheduler, SES y Secrets Manager                                                  |
| Mailpit                 | 1025 y 8025 | SMTP en `localhost:1025`. Interfaz de correos: http://localhost:8025                                                                                                                |
| OpenObserve             | 5080        | http://localhost:5080. Usuario y contraseña de desarrollo en `backend/docker-compose.yml`                                                                                           |
| OpenTelemetry Collector | 4317 y 4318 | OTLP gRPC y HTTP. Los servicios envían a `http://localhost:4318`. Guarda todas las trazas con error y `OTEL_SAMPLING_PERCENT` (10 % por defecto) del resto, y reenvía a OpenObserve |

Las dos bases `identity_shard_0` e `identity_shard_1` son intencionales. Sirven para probar el enrutamiento por shard en local.

Al arrancar, LocalStack corre `backend/infra/local/localstack/init-aws.sh`, que crea el bucket `platform-files-local` y la topología de mensajería desde `backend/infra/terraform/topology.json` (tópicos, colas, DLQ y suscripciones con filtro), con el prefijo `local` de `MESSAGING_NAME_PREFIX`.

LocalStack se fija en una versión que corre sin token. Las versiones con fecha (2026.x) pueden exigir `LOCALSTACK_AUTH_TOKEN`; antes de subir de versión, valida que el plan vigente cubra SQS, SNS, S3, S3 Control, KMS, Scheduler, SES, Secrets Manager, STS, IAM, CloudWatch y Logs.

## Terraform contra el entorno local

El ambiente `local` de Terraform apunta a LocalStack. Desde la raíz:

```bash
backend/infra/scripts/local.sh tf plan
backend/infra/scripts/local.sh tf apply
backend/infra/scripts/local.sh tf destroy
```

`local.sh down` detiene los servicios y `local.sh reset` borra también sus volúmenes. La estructura de stacks y ambientes está en el [ADR 0020](adr/0020-terraform-por-stacks-y-runtime-por-servicio.md).

## Reiniciar los volúmenes

Los scripts de inicialización solo corren cuando el volumen de PostgreSQL está vacío. Para recrear todo desde cero, dentro de `backend/`:

```bash
docker compose down -v
docker compose up -d
```

`down -v` borra los datos de todos los servicios.

Para reiniciar solo PostgreSQL:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker volume rm node-template-local_postgres-data
docker compose up -d postgres
```

El proyecto de Compose se llama `node-template-local`, así que sus volúmenes empiezan con ese prefijo. `docker volume ls` los lista.
