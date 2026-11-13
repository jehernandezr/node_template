import { AsyncLocalStorage } from 'node:async_hooks';
import { ShardingError, ShardingErrorCode } from './errors.js';

const guardStorage = new AsyncLocalStorage<TransactionShardGuard>();

/**
 * Ensures a transaction touches a single logical shard.
 * The first shard touched is remembered; touching another one throws `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 *
 * One guard per transaction, never per request: the `TransactionManager` of `@platform/persistence` wraps
 * each transaction it opens in `TransactionShardGuard.run(fn)`, and calls `current()?.touch(shard)` before
 * each statement. So:
 * - Two transactions of one request, one after the other or in parallel (`Promise.all`), each get their own
 *   guard and may use different shards.
 * - A savepoint or a nested call that joins the open transaction must not call `run` again: it uses the
 *   guard of the transaction it joins.
 * - Outside a transaction there is no guard (`current()` is undefined) and nothing is checked; reads and
 *   `acrossShards()` queries run there.
 */
export class TransactionShardGuard {
  private firstShard: string | undefined;

  /** Runs one transaction body `fn` with a fresh guard visible through {@link TransactionShardGuard.current}. */
  static run<T>(fn: () => T): T {
    return guardStorage.run(new TransactionShardGuard(), fn);
  }

  /** The guard of the surrounding transaction, or undefined outside one. */
  static current(): TransactionShardGuard | undefined {
    return guardStorage.getStore();
  }

  /** @throws ShardingError with `CrossShardTransaction` when a different shard was already touched. */
  touch(logicalShard: string): void {
    if (this.firstShard === undefined) {
      this.firstShard = logicalShard;
      return;
    }
    if (this.firstShard !== logicalShard) {
      throw new ShardingError(
        ShardingErrorCode.CrossShardTransaction,
        'Transaction spans more than one logical shard',
        { details: { firstShard: this.firstShard, logicalShard } },
      );
    }
  }
}
