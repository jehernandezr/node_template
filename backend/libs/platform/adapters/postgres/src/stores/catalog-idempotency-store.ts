import { TypeOrmIdempotencyStore } from './typeorm-idempotency-store.js';

/**
 * `idempotency_keys` del catálogo global. Es una clase aparte solo para inyectarla por su tipo junto al
 * almacén de los shards; la lógica es la misma `ClaimTable`, armada con `CatalogClaimManagers`.
 */
export class CatalogIdempotencyStore<
  R = unknown,
> extends TypeOrmIdempotencyStore<R> {}
