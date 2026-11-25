import type { ShardDirectoryChangeHandler } from './model/shard-directory-changed.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import { ShardDirectoryChannel } from './ports/shard-directory-channel.js';

/**
 * In-process channel: what is published reaches every subscriber of the
 * same instance. It is the single-instance and test mode; across
 * processes, use the Valkey channel from `@platform/adapters-valkey` or the bus.
 */
export class InProcessDirectoryChannel extends ShardDirectoryChannel {
  private readonly handlers = new Set<ShardDirectoryChangeHandler>();

  /** Number of active subscriptions. */
  get subscriberCount(): number {
    return this.handlers.size;
  }

  async publish(event: ShardDirectoryChanged): Promise<void> {
    for (const handler of [...this.handlers]) {
      await handler(event);
    }
  }

  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    // Wrapped so the same handler can be subscribed twice and unsubscribed once.
    const entry: ShardDirectoryChangeHandler = (event) => handler(event);
    this.handlers.add(entry);
    return async () => {
      this.handlers.delete(entry);
    };
  }
}
