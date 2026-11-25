import { RoutingCache } from './ports/routing-cache.js';

/**
 * Shared cache that stores nothing: every read is a miss and no
 * write is accepted. It is the default without Valkey, so `ShardRouter`
 * always queries the directory and its in-process cache.
 */
export class NullRoutingCache extends RoutingCache {
  get(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  setIfNewer(): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}
