# 0023. Routing identity data across shards

- Status: Accepted, amended by [ADR 0029](0029-cross-tenant-maintenance-search-per-shard.md) and [ADR 0037](0037-composition-shared-platform-pieces-and-domain-events.md) (without a tenant in the session the policy shows no rows: it fails closed)
- Date: 2026-11-13

## Context

ADR 0010 introduces sharding in identity with `ShardKey.User`: the router locates the tenant's shard group and chooses the shard with a hash over the user. But a user can belong to several tenants, sign-in arrives without a tenant or a user, and `ShardedDatabaseResolver` takes the user from the actor, which in identity is almost never the user being queried. In addition, a transaction cannot touch two shards.

## Decision

- **Home tenant.** Each user has a fixed `homeTenantId`: the shared customer tenant of their region or the tenant that invited them. Their data (user, credentials, sessions, devices, MFA, passkeys, attempts) is routed with `ShardKey.User` within that tenant's group. The access token carries `htid`.
- **Tenant data.** Tenants, memberships, groups, roles, invitations, service accounts and API keys are routed with `ShardKey.Tenant`.
- **`ShardScope`.** `@platform/persistence` adds `ShardScope.run({ tenantId, keyKind, keyValue }, fn)`, which the resolver uses before the context. With `requireScope`, a query without a scope answers `PLATFORM.SHARDING.KEY_MISSING`. Identity turns it on.
- **Indexes in the catalog**, with routing data only: `identity_lookup` (HMAC of the email), `passkey_lookup` (hash of the credential), `api_key_lookup` (prefix) and `tenant_lookup` (slug).
- **Opaque tokens with a route.** Session token, reset, email verification, `mfaToken`, signed `deviceId` and invitation carry the ids that locate their shard. The secret is stored as an HMAC.
- **Memberships.** The source of truth is in the tenant's shard. `user_tenants`, in the user's shard, is a projection. The use case that changes the membership projects it after the commit, so that "my tenants" sees the change right away, and the consumer of `identity.membership.changed.v1` (queue `identity-access-projection`, published by the outbox in the same transaction) repairs it if the process crashed between the commit and that write. Projecting is idempotent: it reads the current membership from the tenant's shard.
- **RLS on tenant tables.** Tenants, memberships, groups, roles, permission versions, invitations, service accounts and API keys have a policy by `tenant_id` with `FORCE ROW LEVEL SECURITY`. `inTenantShard` puts the block's tenant in the request context, so persistence sets it in `app.tenant_id` when opening the transaction even if the session belongs to another tenant (accepting an invitation, switching tenants, internal operations). Without a tenant in the session the policy does not filter: reads outside a transaction and cross-shard maintenance already filter on their own.
- **Sign-up.** First the email is reserved in `identity_lookup`, then the user is created in their shard and finally the reservation is activated. A job deletes orphaned reservations.
- **Internal API with `requireScope`.** The shard of an internal operation is chosen by its handler from the input (the user and their home tenant, or the tenant), so it is not known before calling it. For a service with `requireScope`, `PlatformRuntimeModule` stores the internal API's idempotency keys in the catalog's `idempotency_keys` (`CatalogIdempotencyStore`) and runs the handler with `HandlerUnitOfWork.Handler`: the handler opens its transactions inside its `ShardScope` and the result is stored separately.

## Consequences

### Positive

- No transaction touches two shards, or the catalog and a shard at the same time.
- A shared tenant with many customers spreads its users across several shards, as the plan requires.
- Refresh and the other token flows reach the shard without reading the catalog.

### Costs

- The home tenant does not change; moving a user to another home tenant is a data move.
- The projection is written twice per change (inline and by the consumer); both write the same thing.
- Until the runtime delivers events with a tenant to a service with `requireScope` (it lacks a `TenantVerifier` and opening the envelope's `ShardScope`), the consumer only runs where it is invoked; the inline projection covers the normal case.
- Attempts with nonexistent emails have no shard: they stay in Valkey and in the logs.
- The result of an internal operation and its effects are not committed in the same transaction: if the process crashes between the two, the call is repeated when the key's reservation expires. That is why every identity handler is idempotent by its input (for example, creating a tenant by `tenantId`).

## Alternatives considered

- A fictitious tenant per region for all users: simpler, but it does not spread a large tenant into its own group.
- Memberships only in the user's shard: listing a tenant's members would require querying every shard.
- Looking up the home tenant in the catalog on every request: one more global read per request.
