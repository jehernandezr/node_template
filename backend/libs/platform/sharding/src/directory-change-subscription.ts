import type { ShardDirectoryChangeSubscriber } from './ports/shard-directory-change-subscriber.js';
import type { ShardRouter } from './shard-router.js';

/**
 * Keeps a `ShardRouter` subscribed to the directory change channel:
 * `start` opens the subscription and `stop` closes it. Both are idempotent.
 */
export class DirectoryChangeSubscription {
  private unsubscribe: (() => Promise<void>) | undefined;

  constructor(
    private readonly router: ShardRouter,
    private readonly subscriber: ShardDirectoryChangeSubscriber,
  ) {}

  /** Opens the subscription. Does nothing if it is already open. */
  async start(): Promise<void> {
    if (this.unsubscribe !== undefined) {
      return;
    }
    this.unsubscribe = await this.router.listen(this.subscriber);
  }

  /** Closes the subscription. Does nothing if it is not open. */
  async stop(): Promise<void> {
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = undefined;
    await unsubscribe?.();
  }
}
