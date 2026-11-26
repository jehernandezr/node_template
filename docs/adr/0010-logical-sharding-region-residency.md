# 0010. Logical sharding by groups and residency by region

- Status: Accepted, amended by [ADR 0023](0023-identity-data-routing.md), [ADR 0024](0024-typeorm-persistence-sharding-persistent-sagas.md), [ADR 0032](0032-tenant-moves-and-regions.md) and [ADR 0042](0042-region-and-catalog-model.md) (one catalog per service and region, one region per environment in F12)
- Date: 2026-11-11

## Context

The platform serves many tenants, some of them very large, and each tenant chooses its country or region for data residency. Growth must not force changes to business code or interrupt tenants.

## Decision

Logical shard: a PostgreSQL database with the service's complete schema. Several logical shards coexist on one physical instance. The routing chain is tenant, region, shard group, logical shard and physical instance.

- Each service has its catalog, which stores only routing data: the tenant to region and group directory, the shard to instance map and, in identity, global indexes and the email HMAC.
- Each service or entity declares its key (`ShardKey.Tenant`, `ShardKey.User` or its own). Without a key, the query fails with `PLATFORM.SHARDING.KEY_MISSING`.
- Default strategy `Directory`. Transactions do not cross shards (`PLATFORM.SHARDING.CROSS_SHARD_TX`).
- Tenant moves (`MoveTenant`) copy in batches by default, or with logical replication when the manifest allows it, and stop writes with a gate (in the directory or in Valkey) and a per-tenant barrier in the source shard ([ADR 0032](0032-tenant-moves-and-regions.md)). Moving a whole shard (`MoveShard`) is not built.
- Each region deploys its own stack (`REGIONS` and `SERVICE_REGION`). Login returns the regional URL, the JWT carries the region (`rgn`) and a tenant from another region responds with `PLATFORM.SHARDING.WRONG_REGION` (421) with the URL of its API, which the front's `ApiClient` follows once ([ADR 0034](0034-live-front-repositories-sse-region.md)).
- The template's five services use shards: one per region in production and two locally and in tests, with one tenant in each.

## Consequences

Positive:

- Growing means adding shards or moving tenants, without changing business code.
- A tenant's data stays in its region.
- Moves happen without requests failing.

Costs:

- Cross-shard queries are explicit, have a concurrency limit and can return partial results.
- Each new region is a complete stack to deploy with Terraform.
- Automatic shard rebalancing is left for a later phase.

## Alternatives considered

- `ConsistentHash`: ring with virtual nodes, for many small keys without a catalog.
- `Range`: key ranges, for keys with a natural order such as dates.
- Custom strategy: an implementation of `ShardingStrategy` for specific business rules.
- A single global stack for all tenants: the document discards it because of data residency.
