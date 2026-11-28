import { SystemClock } from '@platform/kernel';
import { ConsistentHashStrategy, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';

/** Router that records when its caching is suspended and resumed, in order. */
export class RecordingShardRouter extends ShardRouter {
  readonly events: string[] = [];

  constructor() {
    super({
      strategy: new ConsistentHashStrategy(),
      directory: new InMemoryDirectoryStore(),
      clock: new SystemClock(),
    });
  }

  override suspendCaching(): void {
    this.events.push('suspended');
    super.suspendCaching();
  }

  override resumeCaching(): void {
    this.events.push('resumed');
    super.resumeCaching();
  }
}
