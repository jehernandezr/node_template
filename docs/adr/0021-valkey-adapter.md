# 0021. Valkey as the adapter for cache, routing, Bloom and invalidation

- Status: Accepted, amended by [ADR 0044](0044-valkey-failure-policy.md) (Valkey required outside `local`, failure policy per use) and [ADR 0040](0040-internal-routing-and-authentication.md) (the IAM token is signed with `@smithy/signature-v4`)
- Date: 2026-11-13
- Revision: 2026-11-14 (`ValkeyRateLimiter` implements the `@platform/rate-limit` port; the shared `auth:*` space from [ADR 0022](0022-token-verification-shared-revocation-state.md) extends the per-service prefix rule)

## Context

The plan chooses Valkey for the cache, short-lived data, Bloom filters and the sharding routing cache. Until the November 13 audit (finding PLAT-07) those ports only had an in-memory version, so the atomic operations that sharding correctness depends on (`setIfNewer` and the tombstone) were not tested against a real server. In addition, when one process moved a tenant to another shard, the other processes kept writing to the previous shard until their local cache expired (PLAT-13).

## Decision

`backend/libs/platform/adapters/valkey` (`@platform/adapters-valkey`) implements the ports of `@platform/cache`, `@platform/bloom` and `@platform/sharding` with the `iovalkey` client:

- `ValkeyCache` implements `CachePort` with `GET`, `SET PX`, `SET NX`, `DEL` and `INCR`.
- `ValkeyRoutingCache` implements the routing cache. `setIfNewer` is an atomic Lua script over a hash with value and version: it only writes a strictly greater version.
- `ValkeyBloomFilter` uses the `BF.*` commands of the Bloom module. Terraform pins Valkey 8 in AWS and locally `valkey-bundle` runs, both of which ship the module, so there is no bitmap fallback.
- Filters are rebuilt in a temporary key and swapped with `RENAME` in Lua, with no window in which the filter is empty. Above 2^32 bits (for example the HIBP leaked password list), `PartitionedBloomFilter` spreads the elements across several filters.
- Each filter's keys carry a hash tag (`{name}`), so they also work on clustered Valkey.
- `ValkeyShardDirectoryChannel` publishes and listens to `ShardDirectoryChanged` over pub/sub. On receiving it, each process clears only what it holds in memory for that tenant.

Rules:

- Lua scripts are called with `EVALSHA` and resent with `EVAL` on `NOSCRIPT`.
- `ValkeyCommandError` carries its `FailureKind`: transient when the server is down or in failover, permanent with `WRONGTYPE` or an invalid command, and timeout when `commandTimeout` expires. Its codes are `PLATFORM.VALKEY.COMMAND_FAILED` and `PLATFORM.VALKEY.UNEXPECTED_REPLY`.
- The cache timeout lives only in the `Cache` policy of `@platform/resilience` (100 ms, with a circuit breaker). `CacheAside` passes every call through that policy.
- In AWS each service uses a Valkey user with IAM authentication (`VALKEY_AUTH=iam-serverless`) whose ACL limits its keys and channels to the service prefix (ADR 0020). The client signs the token with its own SigV4 (`node:crypto`) and requests a new one on every reconnection.
- Every adapter requires a `ValkeyKeyspace` with the `VALKEY_KEY_PREFIX` prefix (the service name, without `:`). Keys end up as `<p>:…`, `<p>:routing:…` and `<p>:bloom:{name}`, and the channel as `<p>:sharding:directory-changed`.
- Locally, `backend/docker-compose.yml` uses the `valkey/valkey-bundle` image, which ships the Bloom module.

Idempotency does not go in Valkey: the plan places it in PostgreSQL, in the same transaction as the effects (`@platform/persistence`).

## Consequences

### Positive

- The sharding atomic operations are tested against real Valkey (integration tests with Testcontainers, which are skipped without Docker).
- A directory change reaches every process as soon as it is published, without waiting for the local cache to expire.
- A key outside the service prefix fails with `NOPERM`, and the integration test checks it with the same ACL as Terraform.

### Costs

- Pub/sub delivers at most once: a process disconnected during the notice does not receive it. The directory tombstone and the local cache TTL cover it.
- Listening to `ShardDirectoryChanged` requires a dedicated connection per process.
- The Lua scripts are code that has to be maintained along with their tests.

## Alternatives considered

- Invalidating through the messaging bus (SNS/SQS): a queue per service delivers each message to a single consumer, and the invalidation has to reach every process.
- Bitmap fallback (`BITFIELD`) for servers without the Bloom module: it was removed because every environment pins a version that ships it.
