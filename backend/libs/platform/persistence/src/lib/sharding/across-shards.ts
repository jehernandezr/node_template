import { isPlatformError } from '@platform/kernel';
import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import { currentUnitOfWork, type Database } from '../database.js';
import { invalidConfiguration } from '../errors.js';

/** Valores por defecto de {@link acrossShards}. */
export const ACROSS_SHARDS_DEFAULTS = {
  /** Shards consultados a la vez. */
  concurrency: 4,
  /** Tiempo máximo por shard antes de darlo por fallido. */
  shardTimeoutMs: 5_000,
} as const;

/** Opciones de {@link acrossShards}. */
export interface AcrossShardsOptions {
  readonly concurrency?: number;
  readonly shardTimeoutMs?: number;
}

/** Shard que no respondió a tiempo o falló. */
export interface ShardFailure {
  readonly shard: string;
  readonly timedOut: boolean;
  /** Código estable del error, si era un `PlatformError`. */
  readonly code?: string;
}

/** Resultado de una consulta entre shards. */
export interface AcrossShardsResult<T> {
  readonly results: readonly { readonly shard: string; readonly value: T }[];
  readonly failures: readonly ShardFailure[];
  /** `true` si algún shard falló: el resultado no incluye sus filas. */
  readonly partial: boolean;
}

class ShardTimeout extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new ShardTimeout()), ms);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Corre `fn` en cada base, con límite de concurrencia y timeout por shard.
 * Nunca lanza por un shard caído: lo reporta en `failures` y marca `partial`.
 * Es explícita y no corre dentro de una transacción, que vive en un solo shard
 * (lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`). El timeout deja de esperar al
 * shard, pero la sentencia sigue en la base hasta su `statement_timeout`.
 */
export async function acrossShards<T>(
  databases: readonly Database[],
  fn: (database: Database) => Promise<T>,
  options: AcrossShardsOptions = {},
): Promise<AcrossShardsResult<T>> {
  const concurrency = options.concurrency ?? ACROSS_SHARDS_DEFAULTS.concurrency;
  const timeoutMs =
    options.shardTimeoutMs ?? ACROSS_SHARDS_DEFAULTS.shardTimeoutMs;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw invalidConfiguration('concurrency', 'an integer >= 1');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw invalidConfiguration('shardTimeoutMs', 'an integer >= 1');
  }
  if (currentUnitOfWork() !== undefined) {
    throw new ShardingError(
      ShardingErrorCode.CrossShardTransaction,
      'A cross-shard query cannot run inside a transaction',
    );
  }

  const results: { shard: string; value: T }[] = [];
  const failures: ShardFailure[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < databases.length) {
      const database = databases[next];
      next += 1;
      try {
        const value = await withTimeout(fn(database), timeoutMs);
        results.push({ shard: database.name, value });
      } catch (error) {
        failures.push({
          shard: database.name,
          timedOut: error instanceof ShardTimeout,
          ...(isPlatformError(error) ? { code: error.code } : {}),
        });
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, databases.length) }, worker),
  );
  const order = new Map(
    databases.map((database, index) => [database.name, index]),
  );
  results.sort((a, b) => (order.get(a.shard) ?? 0) - (order.get(b.shard) ?? 0));
  failures.sort(
    (a, b) => (order.get(a.shard) ?? 0) - (order.get(b.shard) ?? 0),
  );
  return { results, failures, partial: failures.length > 0 };
}
