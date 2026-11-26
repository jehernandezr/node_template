import type { Clock } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import type { DirectoryStore } from '../ports/directory-store.js';
import { ExpiringLru } from './expiring-lru.js';
import { InvalidationLog } from './invalidation-log.js';

/** Resolves the physical instance of a logical shard, with an in-process cache and an invalidation log. */
export class InstanceResolver {
  private readonly instances: ExpiringLru<string>;
  private readonly invalidations: InvalidationLog;

  /**
   * @param localTtlMs TTL of each instance in the cache.
   * @param maxInstances Capacity of the cache and of the invalidation log.
   */
  constructor(
    private readonly directory: DirectoryStore,
    private readonly clock: Clock,
    private readonly localTtlMs: number,
    maxInstances: number,
  ) {
    this.instances = new ExpiringLru(maxInstances, clock);
    this.invalidations = new InvalidationLog(maxInstances);
  }

  /**
   * Current instance in the cache, or `undefined`.
   * @param logicalShard Logical shard.
   * @returns The instance, or `undefined`.
   */
  cached(logicalShard: string): string | undefined {
    return this.instances.get(logicalShard);
  }

  /**
   * Reads the instance from the directory and caches it unless the shard was invalidated while
   * it was being read.
   * @param logicalShard Logical shard.
   * @returns The instance.
   * @throws ShardingError `UnknownShard` if the directory does not know it.
   */
  async load(logicalShard: string): Promise<string> {
    const since = this.invalidations.current();
    const instance = await this.directory.getInstance(logicalShard);
    if (!instance) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No instance for logical shard',
        { details: { logicalShard } },
      );
    }
    if (this.invalidations.isCurrent(logicalShard, since)) {
      this.instances.set(
        logicalShard,
        instance,
        this.clock.now().getTime() + this.localTtlMs,
      );
    }
    return instance;
  }

  /**
   * Deletes the cached instance and logs the invalidation.
   * @param logicalShard Logical shard.
   */
  invalidate(logicalShard: string): void {
    this.invalidations.mark(logicalShard);
    this.instances.delete(logicalShard);
  }
}
