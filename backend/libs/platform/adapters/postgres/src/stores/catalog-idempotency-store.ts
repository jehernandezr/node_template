import { TypeOrmIdempotencyStore } from './typeorm-idempotency-store.js';

/**
 * `idempotency_keys` of the global catalog. It is a separate class only so it can be injected by its type next to the
 * shard store; the logic is the same `ClaimTable`, built with `CatalogClaimManagers`.
 */
export class CatalogIdempotencyStore<
  R = unknown,
> extends TypeOrmIdempotencyStore<R> {}
