import type { CacheAside } from '@platform/cache';

/**
 * Test `CacheAside`: stores the invalidated keys and answers reads with a direct load,
 * without versions or TTL. Enough to check what the use case invalidates and what the adapter reads.
 */
export class RecordingCacheAside {
  readonly invalidated: (readonly string[])[] = [];

  getOrLoad<T>(options: { readonly load: () => Promise<T> }): Promise<T> {
    return options.load();
  }

  invalidate(namespace: readonly string[]): Promise<void> {
    this.invalidated.push(namespace);
    return Promise.resolve();
  }

  /** The shape `SmokeOrderCache` receives: the same object, without the other `CacheAside` methods. */
  asCacheAside(): CacheAside {
    return this as unknown as CacheAside;
  }
}
