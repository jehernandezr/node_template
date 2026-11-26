# Local development

This guide prepares the repository to work from the root with Nx and starts the local infrastructure: PostgreSQL, Valkey, LocalStack, Mailpit, the OpenTelemetry Collector and OpenObserve.

## Prerequisites

- Node 24, the version in [`.nvmrc`](../.nvmrc).
- pnpm through Corepack. Enable Corepack once with `corepack enable`; the version comes from the `packageManager` field in [`package.json`](../package.json).
- Flutter, the version in [`front/.flutter-version`](../front/.flutter-version).
- Docker with Docker Compose v2.
- Terraform, the version in [`backend/infra/terraform/.terraform-version`](../backend/infra/terraform/.terraform-version), only for infrastructure changes.

## Prepare the repository

From the root:

```bash
corepack enable
pnpm install                    # Nx, the backend and the git hooks, in a single node_modules
cd front && flutter pub get     # the front pub workspace
cd ..
```

The front tasks that Nx runs (`analyze`, `format-check` and `test`) use `--no-pub`, so they need the prior `flutter pub get`.

`pnpm install` creates a single `node_modules` at the root (`nodeLinker: hoisted` in `pnpm-workspace.yaml`). If another one shows up inside `backend/`, some dependency ended up with two versions or a library got a `package.json` again; CI fails in that case. To check it:

```bash
find . -path ./node_modules -prune -o -name node_modules -type d -print -prune   # must print nothing
```

The backend libraries are not compiled. Jest, `tsc` and the tools read their TypeScript through the aliases in `backend/tsconfig.base.json`. The tools in `backend/tools` run with `tsx` through their Nx targets, for example `pnpm nx run contracts-export:check`.

## Everyday commands

All of them run from the root:

| Command                                                                       | What it does                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm nx affected -t lint test test-int typecheck build analyze format-check` | Validates what changed against `main`, the same as CI                  |
| `pnpm nx format:check`                                                        | Checks formatting with Prettier                                        |
| `pnpm nx test platform-saga`                                                  | Runs the unit tests of a backend project                               |
| `INTEGRATION_TESTS=require pnpm nx test-int platform-saga -c ci --coverage`   | Runs its unit and container tests together with the coverage threshold |
| `pnpm nx typecheck platform-saga`                                             | Checks the types of a project's code and tests                         |
| `pnpm nx build <app>`                                                         | Bundles a backend app into `backend/dist/<app>/`                       |
| `pnpm nx test front-shell_core`                                               | Tests a front package                                                  |
| `pnpm nx run contracts-export:export`                                         | Exports the contracts in `backend/libs/contracts` to JSON              |
| `pnpm nx run contracts-export:check`                                          | Fails if the exported JSON is out of date                              |
| `pnpm nx show projects`                                                       | Lists the backend and front projects                                   |
| `pnpm nx graph`                                                               | Opens the project graph                                                |

The `test` target runs the unit tests. Integration and end-to-end tests (`*.int-spec.ts`, `*.e2e-spec.ts`) run with the `test-int` target against one real PostgreSQL and one Valkey per Jest run, started with Testcontainers, and need Docker running. For example, `pnpm nx test-int platform-persistence` and `pnpm nx test-int platform-adapters-valkey`; `pnpm nx test-int <project> -c ci --coverage` runs both kinds with coverage, as CI does. The guards of the repository run with `node .claude/guards/run-gate.mjs`.

The skills' structure scripts check the files changed against `HEAD` (or the whole tree with `--all`):

```bash
node .claude/skills/backend-structure/scripts/check-structure.mjs
node .claude/skills/front-structure/scripts/check-structure.mjs
```

The contracts' Dart is generated inside `front/`:

```bash
cd front
dart run contracts_gen           # regenerates front/packages/contracts
dart run contracts_gen --check   # fails if the generated Dart is out of date
```

To verify that the microfrontends are still deferred on the web, the same as the CI `web-deferred` job:

```bash
cd front/apps/web
flutter build web --release --source-maps
dart run ../../tools/check_deferred_chunks.dart
```

## Start the infrastructure

The local stack lives in `backend/`:

1. Enter the folder with `cd backend`.
2. Copy the apps' environment variables with `cp .env.example .env`. The `.env` file is not committed to git.
3. Start the services with `docker compose up -d`, or from the root with `backend/infra/scripts/local.sh up`, which waits until all of them are healthy.
4. Check the status with `docker compose ps`. All services must show as `healthy`.

Ports are published only on `127.0.0.1`: nothing is exposed to the local network. Images are pinned by tag and digest, and Renovate updates them.

## Services and URLs

| Service                 | Port          | Access                                                                                                                                                                                  |
| ----------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL              | 5432          | Image with pgvector. Development credentials in `backend/docker-compose.yml`. Databases: `catalog`, `identity_shard_0`, `identity_shard_1`, `tasks_shard_0`                             |
| Valkey                  | 6379          | `redis://localhost:6379`, with the Valkey modules (includes the Bloom `BF.*` commands). It has no web interface                                                                         |
| LocalStack              | 4566          | http://localhost:4566. Status: http://localhost:4566/_localstack/health. Services: SQS, SNS, S3, Scheduler, SES and Secrets Manager                                                     |
| Mailpit                 | 1025 and 8025 | SMTP on `localhost:1025`. Mail interface: http://localhost:8025                                                                                                                         |
| OpenObserve             | 5080          | http://localhost:5080. Development user and password in `backend/docker-compose.yml`                                                                                                    |
| OpenTelemetry Collector | 4317 and 4318 | OTLP gRPC and HTTP. Services send to `http://localhost:4318`. It keeps every trace with an error and `OTEL_SAMPLING_PERCENT` (10 % by default) of the rest, and forwards to OpenObserve |

The two databases `identity_shard_0` and `identity_shard_1` are intentional. They are used to test shard routing locally. With persistence on TypeORM, the next phase, each service's migrations add the `saga` schema of the saga log to each shard database and the `saga_directory` table to the catalog ([ADR 0024](adr/0024-typeorm-persistence-sharding-persistent-sagas.md)).

On startup, LocalStack runs `backend/infra/local/localstack/init-aws.sh`, which creates the `platform-files-local` bucket and the messaging topology from `backend/infra/terraform/topology.json` (topics, queues, DLQs and filtered subscriptions), with the `local` prefix from `MESSAGING_NAME_PREFIX`.

LocalStack is pinned to a version that runs without a token. Dated versions (2026.x) may require `LOCALSTACK_AUTH_TOKEN`; before upgrading, validate that the current plan covers SQS, SNS, S3, S3 Control, KMS, Scheduler, SES, Secrets Manager, STS, IAM, CloudWatch and Logs.

## Run identity

With the infrastructure up and `backend/.env` copied from `backend/.env.example` (with your own keys and peppers instead of the `CAMBIAR_...` values):

```sh
pnpm nx run identity:migrate --args="--target=all"   # the catalog and then the shards its directory lists
pnpm nx run identity:seed      # the region's fixed tenants: the platform one and the shared customer one
pnpm nx run identity:serve     # API at http://localhost:3000
pnpm nx run identity:worker    # outbox relay, consumers and jobs
```

`IDENTITY_MAILER=console` writes emails with codes and links to the log; with `memory` they stay only in the process, as in the tests. The identity end-to-end tests (`backend/apps/identity/e2e`) start their own PostgreSQL and Valkey with Testcontainers and do not use this infrastructure.

## Terraform against the local environment

The Terraform `local` environment points to LocalStack. From the root:

```bash
backend/infra/scripts/local.sh tf plan
backend/infra/scripts/local.sh tf apply
backend/infra/scripts/local.sh tf destroy
```

`local.sh down` stops the services and `local.sh reset` also deletes their volumes. The structure of stacks and environments is in [ADR 0020](adr/0020-terraform-stacks-and-runtime-per-service.md).

## Reset the volumes

The initialization scripts only run when the PostgreSQL volume is empty. To recreate everything from scratch, inside `backend/`:

```bash
docker compose down -v
docker compose up -d
```

`down -v` deletes the data of all services.

To reset only PostgreSQL:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker volume rm node-template-local_postgres-data
docker compose up -d postgres
```

The Compose project is called `node-template-local`, so its volumes start with that prefix. `docker volume ls` lists them.
