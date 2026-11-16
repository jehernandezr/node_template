import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import type { ShardingStrategy } from './sharding-strategy.js';
import { ShardStrategy } from './model/shard-strategy.enum.js';

/** Cota superior (inclusiva) de un rango de claves y el shard que lo sirve. */
export interface RangeBoundary {
  readonly upTo: string;
  readonly shard: string;
}

/** Orden total sobre las claves. Por defecto compara unidades de código UTF-16. */
export type KeyComparator = (a: string, b: string) => number;

const compareCodeUnits: KeyComparator = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Asigna claves a shards por rangos ordenados.
 * Una clave va al primer límite con `key <= upTo`; las claves por encima de todos los límites van al último shard.
 */
export class RangeShardStrategy implements ShardingStrategy {
  readonly kind = ShardStrategy.Range;
  private readonly boundaries: readonly RangeBoundary[];
  private readonly lastShard: string;
  private readonly compare: KeyComparator;

  /**
   * @param compare Orden de los límites y de las claves, por ejemplo un comparador numérico para claves numéricas.
   * @throws ShardingError `InvalidConfiguration` por ids de shard vacíos o límites repetidos.
   */
  constructor(
    boundaries: readonly RangeBoundary[],
    lastShard: string,
    compare: KeyComparator = compareCodeUnits,
  ) {
    if (lastShard.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'lastShard must be a non-empty shard id',
      );
    }
    for (const boundary of boundaries) {
      if (boundary.shard.length === 0) {
        throw new ShardingError(
          ShardingErrorCode.InvalidConfiguration,
          `Boundary "${boundary.upTo}" has an empty shard id`,
        );
      }
    }
    const sorted = [...boundaries].sort((a, b) => compare(a.upTo, b.upTo));
    for (let i = 1; i < sorted.length; i++) {
      if (compare(sorted[i - 1].upTo, sorted[i].upTo) === 0) {
        throw new ShardingError(
          ShardingErrorCode.InvalidConfiguration,
          `Duplicate range boundary "${sorted[i].upTo}"`,
        );
      }
    }
    this.boundaries = sorted;
    this.lastShard = lastShard;
    this.compare = compare;
  }

  /** @throws ShardingError `UnknownShard` cuando el shard del rango no forma parte del grupo. */
  locate(key: string, group: readonly string[]): string {
    const shard =
      this.boundaries.find((boundary) => this.compare(key, boundary.upTo) <= 0)
        ?.shard ?? this.lastShard;
    if (!group.includes(shard)) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        "Range shard is not in the tenant's group",
        { details: { shard } },
      );
    }
    return shard;
  }
}
