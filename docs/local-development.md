# Desarrollo local

Esta guía prepara el repositorio para trabajar desde la raíz con Nx y levanta la infraestructura local: PostgreSQL, Valkey, LocalStack, Mailpit y OpenObserve.

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
3. Levanta los servicios con `docker compose up -d`.
4. Revisa el estado con `docker compose ps`. Todos los servicios deben aparecer como `healthy`.

## Servicios y URLs

| Servicio    | Puerto      | Acceso                                                                                                                                                     |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL  | 5432        | Imagen con pgvector. Credenciales de desarrollo en `backend/docker-compose.yml`. Bases: `catalog`, `identity_shard_0`, `identity_shard_1`, `tasks_shard_0` |
| Valkey      | 6379        | `redis://localhost:6379`. No tiene interfaz web                                                                                                            |
| LocalStack  | 4566        | http://localhost:4566. Estado: http://localhost:4566/_localstack/health. Servicios: SQS, SNS, S3, Scheduler, SES y Secrets Manager                         |
| Mailpit     | 1025 y 8025 | SMTP en `localhost:1025`. Interfaz de correos: http://localhost:8025                                                                                       |
| OpenObserve | 5080        | http://localhost:5080. Usuario y contraseña de desarrollo en `backend/docker-compose.yml`                                                                  |

Las dos bases `identity_shard_0` e `identity_shard_1` son intencionales. Sirven para probar el enrutamiento por shard en local.

Al arrancar, LocalStack corre `backend/infra/local/localstack/init-aws.sh`, que crea el bucket `platform-files-local`. El siguiente paso es crear también las colas y los tópicos desde la topología de mensajería.

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
