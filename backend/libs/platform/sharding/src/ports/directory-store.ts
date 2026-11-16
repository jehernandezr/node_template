import type { TenantPlacement } from '../model/tenant-placement.js';

/**
 * Fuente de verdad de los placements de tenants y de las instancias de los
 * shards lógicos (el catálogo). Lado de lectura: `ShardRouter` lo consulta en
 * cada falla de caché. La implementación sobre Postgres es de
 * `@platform/adapters-postgres`; `InMemoryDirectoryStore`, de `@platform/sharding/test-utils`, cubre pruebas.
 */
export abstract class DirectoryStore {
  /** Placement de un tenant en minúsculas, o `undefined` si el tenant no existe. */
  abstract getPlacement(tenantId: string): Promise<TenantPlacement | undefined>;

  /** Instancia física de un shard lógico, o `undefined` si el shard no existe. */
  abstract getInstance(logicalShard: string): Promise<string | undefined>;
}
