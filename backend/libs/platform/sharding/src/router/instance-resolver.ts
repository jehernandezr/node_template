import type { Clock } from '@platform/kernel';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import type { DirectoryStore } from '../ports/directory-store.js';
import { ExpiringLru } from './expiring-lru.js';
import { InvalidationLog } from './invalidation-log.js';

/** Resuelve la instancia física de un shard lógico, con caché en proceso y registro de invalidaciones. */
export class InstanceResolver {
  private readonly instances: ExpiringLru<string>;
  private readonly invalidations: InvalidationLog;

  /**
   * @param localTtlMs TTL de cada instancia en el caché.
   * @param maxInstances Capacidad del caché y del registro de invalidaciones.
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

  /** Instancia vigente en el caché, o `undefined`. */
  cached(logicalShard: string): string | undefined {
    return this.instances.get(logicalShard);
  }

  /**
   * Lee la instancia del directorio y la cachea salvo que el shard se invalidara mientras
   * se leía.
   * @throws ShardingError `UnknownShard` si el directorio no la conoce.
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

  /** Borra la instancia cacheada y registra la invalidación. */
  invalidate(logicalShard: string): void {
    this.invalidations.mark(logicalShard);
    this.instances.delete(logicalShard);
  }
}
