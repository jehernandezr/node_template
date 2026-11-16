import { DeadlineExceededError, Deadline } from '@platform/primitives';
import {
  PlatformError,
  type Clock,
  type TransactionManager,
} from '@platform/kernel';
import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import { invalidConfiguration } from './errors.js';
import type { AcrossShardsOptions } from './model/across-shards-options.js';
import type { AcrossShardsResult } from './model/across-shards-result.js';
import type { ShardConnection } from './model/shard-connection.js';
import type { ShardFailure } from './model/shard-failure.js';
import type { ShardLocation } from './model/shard-location.js';
import type { ShardLister } from './ports/shard-lister.js';
import type { ShardDataSources } from './shard-data-sources.js';

/** Recorre varios shards para reportes y tareas de mantenimiento, con plazo y concurrencia acotada. */
export class AcrossShards {
  static readonly DEFAULT_CONCURRENCY = 4;
  static readonly DEFAULT_SHARD_TIMEOUT_MS = 5_000;

  constructor(
    private readonly lister: ShardLister,
    private readonly sources: ShardDataSources,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * Corre `fn` en cada shard. Nunca lanza por un shard caído: lo reporta en `failures` y marca `partial`.
   * @throws PersistenceError `PersistenceInvalidConfig` por una opción inválida.
   * @throws ShardingError `CrossShardTransaction` si se llama dentro de una transacción.
   */
  async run<T>(
    fn: (connection: ShardConnection) => Promise<T>,
    options?: AcrossShardsOptions,
  ): Promise<AcrossShardsResult<T>> {
    const concurrency =
      options?.concurrency ?? AcrossShards.DEFAULT_CONCURRENCY;
    const timeoutMs =
      options?.shardTimeoutMs ?? AcrossShards.DEFAULT_SHARD_TIMEOUT_MS;
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw invalidConfiguration('concurrency', 'an integer >= 1');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw invalidConfiguration('shardTimeoutMs', 'an integer >= 1');
    }
    if (this.transactions.isInTransaction()) {
      throw new ShardingError(
        ShardingErrorCode.CrossShardTransaction,
        'A cross-shard query cannot run inside a transaction',
      );
    }

    const locations = await this.lister.list();
    const values = Array.from(
      { length: locations.length },
      (): { readonly value: T } | undefined => undefined,
    );
    const failed = Array.from(
      { length: locations.length },
      (): ShardFailure | undefined => undefined,
    );
    let next = 0;

    const worker = async (): Promise<void> => {
      while (next < locations.length) {
        const i = next;
        next += 1;
        const location = locations[i];
        try {
          values[i] = await this.runOne(location, timeoutMs, fn);
        } catch (error) {
          failed[i] = {
            shard: location.logicalShard,
            timedOut: error instanceof DeadlineExceededError,
            code: error instanceof PlatformError ? error.code : undefined,
          };
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, locations.length) }, () =>
        worker(),
      ),
    );

    const results = locations.flatMap((location, i) => {
      const entry = values[i];
      return entry === undefined
        ? []
        : [{ shard: location.logicalShard, value: entry.value }];
    });
    const failures = failed.filter(
      (failure): failure is ShardFailure => failure !== undefined,
    );
    return { results, failures, partial: failures.length > 0 };
  }

  private async runOne<T>(
    location: ShardLocation,
    timeoutMs: number,
    fn: (connection: ShardConnection) => Promise<T>,
  ): Promise<{ readonly value: T }> {
    const dataSource = await this.sources.get(location);
    const value = await Deadline.after(timeoutMs, this.clock).race(() =>
      fn({ location, dataSource }),
    );
    return { value };
  }
}
