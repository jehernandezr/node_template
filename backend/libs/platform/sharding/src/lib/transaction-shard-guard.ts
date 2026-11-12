import { AsyncLocalStorage } from 'node:async_hooks';
import { ShardingError, ShardingErrorCode } from './errors.js';

const guardStorage = new AsyncLocalStorage<TransactionShardGuard>();

/**
 * Ensures a transaction touches a single logical shard.
 * The first shard touched is remembered; touching another one throws.
 *
 * Per request: `TransactionShardGuard.run(fn)` gives `fn` and everything it awaits its own guard,
 * readable with `TransactionShardGuard.current()`.
 */
export class TransactionShardGuard {
  private firstShard: string | undefined;

  /** Runs `fn` with a fresh guard visible through {@link TransactionShardGuard.current}. */
  static run<T>(fn: () => T): T {
    return guardStorage.run(new TransactionShardGuard(), fn);
  }

  /** The guard of the surrounding `run`, or undefined outside one. */
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
        `Transaction spans shards "${this.firstShard}" and "${logicalShard}"`,
      );
    }
  }

  /** Forgets the remembered shard, for reuse across transactions. */
  reset(): void {
    this.firstShard = undefined;
  }
}
