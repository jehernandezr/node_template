import type { CachePort } from './cache-port.js';
import { CacheInvalidArgumentError, CacheKeyTooLongError } from './errors.js';
import { InMemoryCache } from './in-memory-cache.js';
import { queryDigest } from './stable-hash.js';
import { VersionedKeyspace } from './versioned-keyspace.js';

describe('VersionedKeyspace', () => {
  it('creates a stable random version token on first use', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    const first = await keyspace.version(['t1', 'orders']);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await keyspace.version(['t1', 'orders'])).toBe(first);
  });

  it('builds data keys with the prefix, encoded namespace, token and params digest', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    const params = { id: 7 };
    const token = await keyspace.version(['t1', 'orders']);
    expect(await keyspace.key(['t1', 'orders'], params)).toBe(
      `cache:data:t1:orders:v${token}:${queryDigest(params)}`,
    );
  });

  it('uses a custom prefix', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache(), {
      prefix: 'q',
    });
    expect(await keyspace.key(['x'], {})).toMatch(
      /^q:data:x:v[0-9a-f-]{36}:[0-9a-f]{64}$/,
    );
  });

  it('changes every key of the namespace after a bump, and only that namespace', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    const before = await keyspace.key(['t1', 'orders'], { page: 1 });
    const otherBefore = await keyspace.key(['t1', 'users'], { page: 1 });

    const token = await keyspace.bump(['t1', 'orders']);

    expect(await keyspace.version(['t1', 'orders'])).toBe(token);
    expect(await keyspace.key(['t1', 'orders'], { page: 1 })).not.toBe(before);
    expect(await keyspace.key(['t1', 'users'], { page: 1 })).toBe(otherBefore);
  });

  it('never resurrects old data when the version key is evicted', async () => {
    const cache = new InMemoryCache();
    const keyspace = new VersionedKeyspace(cache);
    const oldKey = await keyspace.key(['t1', 'orders'], {});
    await cache.set(oldKey, 'stale');

    await cache.delete('cache:ver:t1:orders');

    expect(await keyspace.key(['t1', 'orders'], {})).not.toBe(oldKey);
    expect(await cache.get(oldKey)).toBe('stale');
  });

  it('keeps namespaces with ":" in a segment distinct', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    const first = await keyspace.key(['t1:x', 'orders'], {});
    const second = await keyspace.key(['t1', 'x:orders'], {});
    expect(first).not.toBe(second);
    expect(first).toContain('t1%3Ax:orders');
  });

  it('produces the same key for the same params regardless of key order', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    expect(await keyspace.key(['n'], { a: 1, b: 2 })).toBe(
      await keyspace.key(['n'], { b: 2, a: 1 }),
    );
  });

  it('builds distinct keys for params that differ only in a __proto__ key', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache());
    const polluted = JSON.parse('{"__proto__":{"role":"admin"}}') as unknown;
    expect(await keyspace.key(['n'], polluted)).not.toBe(
      await keyspace.key(['n'], {}),
    );
  });

  it('rejects keys longer than maxKeyLength before touching the store', async () => {
    const cache = new InMemoryCache();
    const get = jest.spyOn(cache, 'get');
    const keyspace = new VersionedKeyspace(cache, { maxKeyLength: 200 });

    await expect(keyspace.key(['x'.repeat(300)], {})).rejects.toBeInstanceOf(
      CacheKeyTooLongError,
    );
    await expect(keyspace.key(['é'.repeat(60)], {})).rejects.toBeInstanceOf(
      CacheKeyTooLongError,
    );
    expect(get).not.toHaveBeenCalled();
    await expect(keyspace.key(['short'], {})).resolves.toMatch(/^cache:data/);
  });

  it('rejects an invalid prefix, key bound or namespace', async () => {
    const cache = new InMemoryCache();
    expect(() => new VersionedKeyspace(cache, { prefix: 'a:b' })).toThrow(
      CacheInvalidArgumentError,
    );
    expect(() => new VersionedKeyspace(cache, { prefix: '' })).toThrow(
      CacheInvalidArgumentError,
    );
    expect(() => new VersionedKeyspace(cache, { maxKeyLength: 0 })).toThrow(
      CacheInvalidArgumentError,
    );
    await expect(
      new VersionedKeyspace(cache).key([1 as unknown as string], {}),
    ).rejects.toBeInstanceOf(CacheInvalidArgumentError);
  });

  it('replaces a corrupt version token instead of embedding it in keys', async () => {
    const cache = new InMemoryCache();
    const keyspace = new VersionedKeyspace(cache);
    await cache.set('cache:ver:n', 'x'.repeat(10_000));

    const token = await keyspace.version(['n']);

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(await cache.get('cache:ver:n')).toBe(token);
  });

  describe('under concurrency', () => {
    /** Deterministic pseudo-random source, so interleavings are reproducible. */
    function seeded(seed: number): () => number {
      let state = seed;
      return () => {
        state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
        return state / 2 ** 32;
      };
    }

    /** Store whose calls finish after a random number of event-loop turns. */
    function jitteryCache(random: () => number): {
      cache: CachePort;
      store: InMemoryCache;
    } {
      const store = new InMemoryCache();
      const pause = async (): Promise<void> => {
        const turns = Math.floor(random() * 4);
        for (let i = 0; i < turns; i += 1) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      };
      const cache: CachePort = {
        get: async (key) => {
          await pause();
          return store.get(key);
        },
        set: async (key, value, ttlMs) => {
          await pause();
          return store.set(key, value, ttlMs);
        },
        setIfAbsent: async (key, value) => {
          await pause();
          return store.setIfAbsent(key, value);
        },
        delete: async (key) => {
          await pause();
          return store.delete(key);
        },
        incr: async (key) => {
          await pause();
          return store.incr(key);
        },
      };
      return { cache, store };
    }

    it('makes concurrent first readers agree on one token', async () => {
      for (let seed = 1; seed <= 20; seed += 1) {
        const { cache } = jitteryCache(seeded(seed));
        const keyspace = new VersionedKeyspace(cache);

        const tokens = await Promise.all(
          Array.from({ length: 25 }, () => keyspace.version(['t1', 'orders'])),
        );

        expect(new Set(tokens).size).toBe(1);
        expect(await keyspace.version(['t1', 'orders'])).toBe(tokens[0]);
      }
    });

    it('hides a write made under a token taken before a racing bump', async () => {
      const { cache, store } = jitteryCache(seeded(7));
      const keyspace = new VersionedKeyspace(cache);

      // A reader takes the current token and starts a slow load...
      const staleKey = await keyspace.key(['t1', 'orders'], { page: 1 });
      // ...a writer commits and bumps meanwhile...
      await keyspace.bump(['t1', 'orders']);
      // ...and the reader stores the old data under its old key.
      await store.set(staleKey, 'stale');

      const freshKey = await keyspace.key(['t1', 'orders'], { page: 1 });
      expect(freshKey).not.toBe(staleKey);
      expect(await store.get(freshKey)).toBeUndefined();
    });

    it.each([
      ['an existing token', true],
      ['a first use', false],
    ])(
      'never lets a reader overwrite a bump that raced %s',
      async (_case, warm) => {
        for (let seed = 1; seed <= 20; seed += 1) {
          const { cache } = jitteryCache(seeded(seed));
          const keyspace = new VersionedKeyspace(cache);
          const namespace = ['t1', 'orders'];
          const before = warm ? await keyspace.version(namespace) : undefined;

          const readers = Array.from({ length: 10 }, () =>
            keyspace.version(namespace),
          );
          const bumped = await Promise.all(
            Array.from({ length: 3 }, () => keyspace.bump(namespace)),
          );
          await Promise.all(readers);
          const after = await Promise.all(
            Array.from({ length: 10 }, () => keyspace.version(namespace)),
          );

          // The stored token is the last bump: a first-use reader only ever
          // writes with setIfAbsent, so it cannot replace a bumped token.
          expect(bumped).toContain(after[0]);
          expect(new Set(after).size).toBe(1);
          expect(after[0]).not.toBe(before);
        }
      },
    );
  });
});
