import { AsyncLocalStorage } from 'node:async_hooks';
import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';

/**
 * Ensures a transaction touches a single logical shard.
 * The first shard touched is remembered; touching another throws `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 *
 * One guard per transaction, never per request: the `TransactionManager` from `@platform/persistence` wraps
 * each transaction it opens in `TransactionShardGuard.run(fn)` and calls `current()?.touch(shard)` before
 * each statement. Therefore:
 * - Two transactions of the same request, one after another or in parallel (`Promise.all`), each have their
 *   own guard and can use different shards.
 * - A savepoint or a nested call that joins the open transaction must not call `run` again:
 *   it uses the guard of the transaction it joins.
 * - Outside a transaction there is no guard (`current()` is undefined) and nothing is checked; reads and
 *   `acrossShards()` queries run there.
 */
export class TransactionShardGuard {
  private static readonly storage =
    new AsyncLocalStorage<TransactionShardGuard>();

  private firstShard: string | undefined;

  /** Runs the body `fn` of a transaction with a new guard visible through {@link TransactionShardGuard.current}. */
  static run<T>(fn: () => T): T {
    return TransactionShardGuard.storage.run(new TransactionShardGuard(), fn);
  }

  /** The guard of the transaction that wraps the call, or undefined if there is none. */
  static current(): TransactionShardGuard | undefined {
    return TransactionShardGuard.storage.getStore();
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
