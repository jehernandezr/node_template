# 0009. RDS PostgreSQL with an in-house persistence layer

- Status: Superseded by [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)
- Date: 2026-11-11
- Revised: 2026-11-14 (a single path on `pg`, without TypeORM)
- Superseded: 2026-11-14 by [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md) (persistence on TypeORM)

This ADR is kept as a historical record. The in-house layer on `pg` and the hand-written SQL migrations are replaced by TypeORM and its CLI. The following are kept from this ADR: the RDS PostgreSQL database with RDS Proxy and a read replica, RLS, range partitions on the UUIDv7, auditing with triggers and vector search in the same database.

## Context

The original template uses `sync({ alter: true })` at startup and has no migrations. The platform needs PostgreSQL with RLS, partitions, vector search and logical replication, without the domain depending on a specific ORM.

## Decision

The database is RDS PostgreSQL with RDS Proxy and a read replica. `libs/platform/persistence` is an in-house layer on the `pg` driver, without an ORM: the domain sees only repository ports.

There is a single path for each piece:

- Connection: `PgPoolConnection` on `pg.Pool`, with one pool for the primary and another for the replica.
- Table: a hand-written `TableDefinition` next to the record (field to column, id, version, tenant, soft delete and auditing). `BaseRepository` builds all its SQL from it.
- Migrations: `SqlMigration` in plain SQL, applied with `applyMigrations`. Each migration runs in its own transaction and is recorded in `platform_schema_migrations`. The whole cycle takes `pg_advisory_lock`, so two tasks that start at the same time do not apply the same migration. There is no `migration:generate`: the SQL is written and reviewed.

In addition:

- `BaseRepository` offers reads, writes, optimistic locking on a `version` column, its own `Criteria` and Unit of Work with the `TransactionManager` port. The port lives in `@platform/primitives`, without the SQL session, so that messaging and the internal API do not depend on this layer.
- Automatic audit columns and soft delete. Every SQL statement carries `/* traceId=… tenantId=… */`.
- Reads go to the replica, except inside a transaction. The layer does not remember writes across requests, because the next one may land in another process. Whoever needs to read what they just committed without a transaction uses `readPrimary`.
- Range partitions on the UUIDv7 `id`, created with `createPartitionedTableSql`. A job creates future partitions and archives expired ones.
- Auditing with per-table triggers that write to `audit_log`. `@Audited` declares the excluded columns next to the record.
- The adapters for other libraries' ports on Postgres (idempotency, shard directory, outbox, processed messages) and their tables live in `libs/platform/adapters/postgres`, which exports complete `shardMigrations` and `catalogMigrations`.

## Consequences

Positive:

- A single way to define tables, connect and migrate, without ORM metadata that the layer does not use.
- Vector search lives in the same database and under the same tenant rules.

Costs:

- The layer is in-house code that has to be maintained and tested.
- Without a migration generator, every schema change is written in SQL by hand.
- The behavior of RDS Proxy with session variables (`app.tenant_id`) is validated in the persistence phase. Until then it is an assumption.

## Alternatives considered

- A separate search engine: the document discards it, because pgvector handles semantic search in the same shard.
- TypeORM as the only path (entities, metadata and `migration:generate`): it forces every table to be declared twice, as an entity and as the layer's SQL, and adds a large dependency the repository does not need.
- Reading from the primary for a few seconds after writing: with several tasks behind the load balancer it only works inside the same process, so it does not give the guarantee it promises.
