import { AsyncLocalStorage } from 'node:async_hooks';
import type { ShardConnection } from '@platform/persistence';

/**
 * Pins a logical shard for the running block, without a tenant or request: used by the outbox relay and the
 * maintenance tasks, which go through all shards. While there is a fixed shard, `PlatformEntityManagers`
 * works against that `DataSource` instead of resolving the shard by the context tenant.
 */
export class ShardBinding {
  private readonly storage = new AsyncLocalStorage<ShardConnection>();

  run<T>(connection: ShardConnection, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(connection, fn);
  }

  /** The fixed shard of the block that wraps the call, or `undefined` if there is none. */
  current(): ShardConnection | undefined {
    return this.storage.getStore();
  }
}
