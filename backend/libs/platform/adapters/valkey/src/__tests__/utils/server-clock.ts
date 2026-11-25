import type { Valkey } from 'iovalkey';
import { CachePort } from '@platform/cache';
import { RoutingCache } from '@platform/sharding';

/**
 * Makes a millisecond TTL deterministic against a real server. A fake clock
 * does not reach Valkey and waiting `ttl - 1` real ms is a race with
 * latency, so the TTLs are scaled by `SCALE` and `advance` ages the
 * keys by removing remaining time: the real latency of a few milliseconds
 * stays well below one virtual millisecond.
 */
export class ServerClock {
  static readonly SCALE = 1_000;

  constructor(
    private readonly admin: Valkey,
    private readonly pattern: string,
  ) {}

  /** Ages each key with a TTL by `virtualMs` virtual milliseconds; the one that reaches 0 expires. */
  async advance(virtualMs: number): Promise<void> {
    const keys = (await this.admin.call('KEYS', this.pattern)) as string[];
    for (const key of keys) {
      const remaining = Number(await this.admin.call('PTTL', key));
      if (remaining < 0) {
        continue;
      }
      const left = remaining - virtualMs * ServerClock.SCALE;
      await (left <= 0
        ? this.admin.call('DEL', key)
        : this.admin.call('PEXPIRE', key, String(left)));
    }
  }

  /** Wraps a cache so its TTLs live in virtual milliseconds. */
  scaled(cache: CachePort): CachePort {
    return new ScaledTtlCache(cache);
  }

  /** Wraps a routing cache so its TTLs live in virtual milliseconds. */
  scaledRouting(cache: RoutingCache): RoutingCache {
    return new ScaledTtlRoutingCache(cache);
  }
}

/** Multiplies each TTL by {@link ServerClock.SCALE} before passing it to the real cache. */
class ScaledTtlCache extends CachePort {
  constructor(private readonly inner: CachePort) {
    super();
  }

  get(key: string): Promise<string | undefined> {
    return this.inner.get(key);
  }

  set(key: string, value: string, ttlMs?: number): Promise<void> {
    return this.inner.set(
      key,
      value,
      ttlMs === undefined ? undefined : ttlMs * ServerClock.SCALE,
    );
  }

  setIfAbsent(key: string, value: string): Promise<boolean> {
    return this.inner.setIfAbsent(key, value);
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }
}

/** Multiplies each TTL by {@link ServerClock.SCALE} before passing it to the real routing cache. */
class ScaledTtlRoutingCache extends RoutingCache {
  constructor(private readonly inner: RoutingCache) {
    super();
  }

  get(key: string): Promise<string | undefined> {
    return this.inner.get(key);
  }

  setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    return this.inner.setIfNewer(
      key,
      value,
      version,
      ttlMs * ServerClock.SCALE,
    );
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }
}
