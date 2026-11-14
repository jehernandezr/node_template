import type { Clock } from '@platform/kernel';
import type { ShardingStrategy } from '../sharding-strategy.js';
import type { DirectoryStore } from '../ports/directory-store.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import type { ShardDirectoryChangePublisher } from '../ports/shard-directory-change-publisher.js';

/** Opciones de `ShardRouter`. */
export interface ShardRouterOptions {
  readonly directory: DirectoryStore;
  /** Caché compartido entre procesos. Opcional. Sus fallas caen al directorio. */
  readonly sharedCache?: RoutingCache;
  /** TTL en proceso de placements e instancias. Por defecto 60 s. Un placement nunca vive más que su entrada compartida. */
  readonly localTtlMs?: number;
  /** TTL de los placements escritos en el caché compartido. Por defecto 300 s. */
  readonly sharedTtlMs?: number;
  /**
   * TTL de la lápida que deja `invalidate` en el caché compartido. Por defecto
   * 30 s. Una carga de placement que tarda eso o más no se escribe en el caché
   * compartido, así ninguna invalidación que solapó puede deshacerse.
   */
  readonly tombstoneTtlMs?: number;
  /** Fuente de tiempo. Por defecto el reloj del sistema. */
  readonly clock?: Clock;
  /** Elige el shard dentro de un grupo con más de uno. Por defecto, hash consistente. */
  readonly strategy?: ShardingStrategy;
  /** Región que sirve este proceso. Los placements de otras regiones lanzan `WrongRegionError`. */
  readonly currentRegion?: string;
  /**
   * Recibe las fallas del caché compartido y del canal de cambios, y los
   * cambios malformados. Un caché o canal caído nunca hace fallar un `resolve` ni un `invalidate`.
   */
  readonly onCacheError?: (error: unknown) => void;
  /**
   * Canal hacia los demás procesos del servicio. Con él, `invalidate` publica
   * `ShardingEvent.ShardDirectoryChanged` tras escribir la lápida, y cada
   * proceso que llamó a `ShardRouter.listen` descarta su copia en proceso al
   * instante en vez de esperar `localTtlMs`.
   */
  readonly changes?: ShardDirectoryChangePublisher;
  /**
   * Máximo de tenants en el caché de placements en proceso, y de
   * invalidaciones y cargas en vuelo registradas. Se expulsa primero el menos
   * reciente. Por defecto 10 000.
   */
  readonly maxPlacements?: number;
  /** Máximo de shards lógicos en el caché de instancias en proceso. Por defecto 10 000. */
  readonly maxInstances?: number;
  /** Longitud máxima de la clave de enrutamiento (`keyValue`), en unidades UTF-16. Por defecto 256. */
  readonly maxKeyLength?: number;
  /**
   * Formato que deben cumplir los ids de tenant, sin las banderas `g` ni `y`.
   * Por defecto `TenantId.DEFAULT_PATTERN`. Los ids más largos que
   * `TenantId.MAX_LENGTH` se rechazan sea cual sea el patrón.
   */
  readonly tenantIdPattern?: RegExp;
}
