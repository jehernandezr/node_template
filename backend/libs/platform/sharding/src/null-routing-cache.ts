import { RoutingCache } from './ports/routing-cache.js';

/**
 * Shared cache that stores nothing: every read is a miss and no
 * write is accepted. It is the default without Valkey, so `ShardRouter`
 * always queries the directory and its in-process cache.
 */
export class NullRoutingCache extends RoutingCache {
  override get(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  override setIfNewer(): Promise<boolean> {
    return Promise.resolve(false);
  }

  override delete(): Promise<void> {
    return Promise.resolve();
  }
}
