import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { LruMap } from './lru-map.js';
import { ShardStrategy } from './model/shard-strategy.enum.js';

/** Elige el shard lógico de una clave dentro del grupo de shards de un tenant. */
export interface ShardingStrategy {
  /** Nombre declarativo de una estrategia integrada. Las estrategias propias no lo declaran. */
  readonly kind?: ShardStrategy;
  /**
   * @param key Clave de enrutamiento normalizada.
   * @param group Grupo de shards del tenant, no vacío.
   * @param version Versión del placement. Una estrategia cuyo resultado depende de algo más que el grupo
   *   (por ejemplo rangos guardados por placement) puede indexar su estado derivado por ella; las integradas la ignoran.
   * @throws ShardingError `UnknownShard` cuando ningún shard puede atender la clave.
   */
  locate(key: string, group: readonly string[], version?: number): string;
}

/** Opciones de {@link ConsistentHashStrategy}. */
export interface ConsistentHashStrategyOptions {
  /** Máximo de anillos memorizados (uno por grupo distinto); se descarta el usado menos recientemente. Por defecto 1 024. */
  readonly maxRings?: number;
}

/**
 * Hash consistente sobre el grupo. Los anillos se memorizan por el grupo ordenado (JSON del grupo), como máximo
 * `maxRings`. El anillo depende solo de los miembros del grupo, así los tenants que comparten grupo comparten
 * un anillo sin importar sus versiones de placement; un cambio de grupo (un miembro nuevo) construye un anillo nuevo.
 */
export class ConsistentHashStrategy implements ShardingStrategy {
  readonly kind = ShardStrategy.ConsistentHash;
  private readonly rings: LruMap<string, ConsistentHashRing>;

  /** @throws ShardingError `InvalidConfiguration` cuando `maxRings` no es un entero positivo. */
  constructor(options: ConsistentHashStrategyOptions = {}) {
    this.rings = new LruMap(options.maxRings ?? 1_024);
  }

  locate(key: string, group: readonly string[]): string {
    if (group.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Shard group is empty',
      );
    }
    const shard = this.ringFor(group).locate(key);
    if (shard === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No shard found for key',
      );
    }
    return shard;
  }

  private ringFor(group: readonly string[]): ConsistentHashRing {
    const memoKey = JSON.stringify([...group].sort());
    const memo = this.rings.get(memoKey);
    if (memo !== undefined) {
      return memo;
    }
    const ring = new ConsistentHashRing();
    for (const shard of group) {
      ring.add(shard);
    }
    this.rings.set(memoKey, ring);
    return ring;
  }
}
