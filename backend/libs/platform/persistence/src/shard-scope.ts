import { AsyncLocalStorage } from 'node:async_hooks';
import {
  ShardAccess,
  TransactionShardGuard,
  type ShardRouter,
} from '@platform/sharding';
import type { ShardScopeInit } from './model/shard-scope-init.js';

/**
 * Runs a block on the shard of an explicit key, for the cases of ADR 0023 (for example,
 * the user of another tenant). While the block runs, `ShardResolver` uses this key instead of the context.
 */
export class ShardScope {
  private readonly storage = new AsyncLocalStorage<ShardScopeInit>();

  constructor(private readonly router: ShardRouter) {}

  /**
   * @throws ShardingError `CrossShardTransaction` if there is an open transaction and the key points to another shard.
   */
  async run<T>(init: ShardScopeInit, fn: () => Promise<T>): Promise<T> {
    const guard = TransactionShardGuard.current();
    if (guard !== undefined) {
      // Inside a transaction the block must land on the same shard it already touched.
      const resolved = await this.router.resolve({
        tenantId: init.tenantId,
        keyKind: init.keyKind,
        keyValue: init.keyValue,
        access: ShardAccess.Read,
      });
      guard.touch(resolved.logicalShard);
    }
    return this.storage.run(init, fn);
  }

  /** The key of the block that wraps the call, or `undefined` if there is none. */
  current(): ShardScopeInit | undefined {
    return this.storage.getStore();
  }
}
