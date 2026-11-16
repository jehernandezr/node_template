import { RoutingCache } from '../../ports/routing-cache.js';
import { InMemoryRoutingCache } from './in-memory-routing-cache.js';

/** Caché compartido que delega en uno en memoria y puede fallar a voluntad, para probar la degradación al directorio. */
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
