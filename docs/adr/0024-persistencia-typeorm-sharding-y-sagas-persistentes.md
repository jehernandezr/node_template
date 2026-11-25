# 0024. Persistence on TypeORM with sharding and persistent sagas

- Status: Accepted
- Date: 2026-11-14
- Supersedes: [ADR 0009](0009-rds-postgresql-capa-persistencia-propia.md) in the persistence layer. The database is still RDS PostgreSQL with RDS Proxy and replicas.
- Design: [persistence on TypeORM with sharding and persistent sagas](../design/persistencia-typeorm-y-sagas.md)

## Context

The November 14 review left `@platform/persistence` only on the `pg` driver: each service writes its `TableDefinition` and the SQL of each migration by hand (ADR 0009). The user's requirements for the backend are enterprise code, TypeORM and a platform that is easy to use (review of the backend libraries on the same day). In addition, the saga engine keeps its log in `InMemorySagaStore`.

## Decision

- TypeORM is the ORM: entities, `DataSource`, `EntityManager`, `QueryBuilder` and migrations generated with its CLI. `synchronize` is off. A repository uses handwritten SQL only where TypeORM falls short.
- `@platform/persistence` wraps TypeORM and adds what is specific to the platform: choosing the logical shard, reaching the physical instance, keeping the transaction in a single shard, reading from the replica and migrating every database. Its pieces are `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `EntityManagerProvider`, `ShardedRepository`, `CatalogRepository`, `ShardScope`, `AcrossShards`, `ShardedMigrationRunner` and `PersistenceModule`.
- Each module declares its key in `PersistenceModule.forFeature({ entities, sharding: { key } })` with `ShardKey.Tenant`, `ShardKey.User` or `ShardKey.Custom`. The service writes entities, mappers, repositories and migrations; routing is transparent.
- The platform tables (outbox, processed messages, idempotency, shard directory and saga log) have their entities and migrations in `@platform/adapters-postgres`.
- Sagas: `TypeOrmSagaStore` keeps `saga.instances` and `saga.step_log` in a `saga` schema inside the shard database of the orchestrating service. Each protected write is an `UPDATE ... WHERE version = :v AND lease_token = :t`. The `saga_directory` table in the service's catalog says where each saga lives, without payloads.
- `SagaEngine` keeps `start` and `resume`. `SagaModule.forFeature([...])` builds it with default values, and a use case calls `sagas.start(Definition, state, { idempotencyKey })`.

### Ports, replica and migrations

- The ports live in `@platform/kernel`: `TransactionManager`, `UnitOfWork`, `TransactionHook`, `TransactionOptions` and `IsolationLevel` in `kernel/src/ports/transaction/`, and `IdempotencyStore` with `ClaimState` in `kernel/src/ports/idempotency/`. `TypeOrmTransactionManager` implements the kernel port.
- Reads go to the replica, except inside a transaction or with `readPrimary()`. A transaction touches a single shard: `ShardScope` with `requireScope` and the `CROSS_SHARD_TX` error enforce it.
- Migrations are per service, in `migrations/shard` and `migrations/catalog`. They are generated with the TypeORM CLI and applied by the `migrate` binary with `ShardedMigrationRunner` under `pg_advisory_lock`. Each migration has `up` and `down`.

### Wiring and API

- Repositories use an asynchronous API: `this.read(fn)`, `this.readPrimary(fn)` and `this.write(fn)` take a function that receives the `EntityManager` and returns its result. `this.tenantId()` gives the tenant that owns the repository's own queries. The synchronous `this.manager()` from the design example does not exist, because the router resolves the shard asynchronously.
- `RepositoryKit` gathers what a repository needs besides its mapper: the module declaration (`PersistenceFeature`), the manager provider, the optimistic writer, the context and the `ShardScope`. `PersistenceModule.forFeature` builds the declaration with `entities` and `sharding` and hands it to the repository by injection.
- `ShardLister` is the port that lists the service's logical shards with their instance. The directory implements it, and `forRoot` requires it: without it, it does not start.
- `requireScope` makes an active `ShardScope` mandatory. Without a scope, every resolution fails with `PLATFORM.SHARDING.KEY_MISSING`. With a scope, the block's key takes precedence over the context's tenant.
- The `DB_*` configuration covers `DB_USER` and `DB_PASSWORD` (secret) for every connection, `DB_SSL`, `DB_POOL_MAX`, `DB_STATEMENT_TIMEOUT_MS`, `DB_CATALOG_NAME` and `DB_CATALOG_INSTANCE` for the catalog, and `DB_INSTANCES`, a JSON object that maps each instance to its primary and its read replicas.
- The database name is the logical shard id. The catalog is named whatever `DB_CATALOG_NAME` says.
- The `migration-generate` target creates a temporary database, applies the existing migrations to it and compares the result with the entities. The new migration contains only the difference.
- The criteria's `like` and `ilike` patterns reach the database unescaped: the caller escapes `%` and `_` with its utility.
- The old code on `pg` lives in `persistence/src/legacy/` until the platform tables move to TypeORM.

## Consequences

### Positive

- Migrations are generated from the entities: each table is declared once.
- A saga starts in the same transaction as the local change that triggers it, and its data stays in the tenant's region (ADR 0010).
- The history of any saga is found by its id in the catalog, without walking the shards.

### Costs

- TypeORM is a large dependency, and the layer that wraps it is in-house code that is tested with two shards on real Postgres.
- `SagaRecoveryJob` walks every shard of the service with `AcrossShards` and `FOR UPDATE SKIP LOCKED`.
- Construction comes in three packages of the design: P1 (persistence core), P2 (platform tables) and P3 (saga engine).

## Alternatives considered

- An in-house layer on `pg` without an ORM (ADR 0009): every table and every migration is written by hand.
- A saga database shared by all services: it couples the services and is a single point of failure.
- AWS Step Functions as the orchestrator: it ties the platform to AWS, limits the payload to 256 KB and charges per transition.
