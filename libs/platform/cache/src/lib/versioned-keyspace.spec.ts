import { InMemoryCache } from './in-memory-cache.js';
import { stableDigest } from './stable-hash.js';
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
      `cache:data:t1:orders:v${token}:${stableDigest(params)}`,
    );
  });

  it('uses a custom prefix', async () => {
    const keyspace = new VersionedKeyspace(new InMemoryCache(), {
      prefix: 'q',
    });
    expect(await keyspace.key(['x'], {})).toMatch(
      /^q:data:x:v[0-9a-f-]{36}:[0-9a-f]{32}$/,
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
});
