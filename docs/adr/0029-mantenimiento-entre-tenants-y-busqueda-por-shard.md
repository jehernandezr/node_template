# 0029. Cross-tenant maintenance with RLS and search per shard

- Status: Accepted
- Date: 2026-11-22
- Related: [ADR 0023](0023-enrutamiento-de-datos-de-identity.md), [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)

## Context

Tenant tables have RLS forced by `app.tenant_id` and the service role does not have `BYPASSRLS`. Some jobs walk every tenant in a shard: purging deleted tasks and deleting a user's data in every tenant where they wrote. Without a tenant in the session, RLS shows no rows, and the shard directory does not offer the list of tenants in a shard. In addition, the base for tenant table repositories lived inside identity and `tasks` needed it as well. Separately, `@platform/search` needs to store the text and the vector of each document.

## Decision

- `TenantIsolatedRepository` and `TenantIsolationSql` move to `@platform/persistence`. Reads outside a transaction go to the replica inside a read-only transaction with the tenant set; `readPrimary` is kept for what must see freshly committed data.
- A table that needs it adds `TenantIsolationSql.allowMaintenance`: a policy that lets through the transaction marked with `app.maintenance = on`. Only `TenantMaintenanceSession` marks it, and it is only valid inside that transaction.
- `@platform/search` stores the documents in `search_documents`, a table per shard with RLS per tenant, a `tsvector` column generated with the configured language and a pgvector vector. Both modes (`SEARCH_MODE`) use the same table, so switching modes requires no migration. The `vector` extension is created by whoever provisions the database, because the service role cannot create extensions.

## Consequences

Positive:

- Purges and user deletions run with the service role, without one more privileged role.
- RLS is still the second barrier of every normal query.

Costs:

- A query inside a maintenance transaction sees every tenant in the shard: that code lives only in the maintenance adapters and is tested against real PostgreSQL.
- In hybrid mode the vector is computed at indexing time, inside the write transaction; with a remote embeddings provider indexing will have to happen after the commit.

## Alternatives considered

- A role with `BYPASSRLS` for the jobs: another credential to rotate and distribute.
- Walking the tenants of each shard: the directory does not list them per shard and the query grows with the number of tenants.
