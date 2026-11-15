import type { ShardFailure } from './shard-failure.js';

/** Resultado de recorrer varios shards. */
export interface AcrossShardsResult<T> {
  readonly results: readonly { readonly shard: string; readonly value: T }[];
  readonly failures: readonly ShardFailure[];
  /** `true` si algún shard falló: el resultado no incluye sus filas. */
  readonly partial: boolean;
}
