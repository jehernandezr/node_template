import { RoutingCache } from '../../ports/routing-cache.js';
import { InMemoryRoutingCache } from './in-memory-routing-cache.js';

/** Shared cache that delegates to an in-memory one and can fail at will, to test the fallback to the directory. */
export class FailingRoutingCache extends RoutingCache {
  failReads = false;
  failWrites = false;

  constructor(
    private readonly inner: RoutingCache = new InMemoryRoutingCache(),
  ) {
    super();
  }

  get(key: string): Promise<string | undefined> {
    return this.failReads
      ? Promise.reject(new Error('shared cache is down'))
      : this.inner.get(key);
  }

  setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    return this.failWrites
      ? Promise.reject(new Error('shared cache is down'))
      : this.inner.setIfNewer(key, value, version, ttlMs);
  }

  delete(key: string): Promise<void> {
    return this.failWrites
      ? Promise.reject(new Error('shared cache is down'))
      : this.inner.delete(key);
  }
}
