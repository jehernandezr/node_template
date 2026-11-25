import {
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CanonicalJson, PrimitivesErrorCode } from '@platform/primitives';
import { CacheErrorCode } from '../errors/cache-error-code.enum.js';
import { InMemoryCache } from '../in-memory-cache.js';
import { VersionedKeyspace } from '../versioned-keyspace.js';
import { CyclicValue } from './utils/cyclic-value.js';
import { CacheKeyTooLongError } from '../errors/cache-key-too-long.error.js';

const ORDERS = ['t1', 'orders'];

describe('VersionedKeyspace', () => {
  it('builds the same key for the same namespace and params', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const first = await keyspace.key(ORDERS, { page: 1 });
    const second = await keyspace.key(ORDERS, { page: 1 });
    expect(second).toBe(first);
  });

  it('ignores the order of the keys in the params', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const first = await keyspace.key(ORDERS, { page: 1, sort: 'asc' });
    const second = await keyspace.key(ORDERS, { sort: 'asc', page: 1 });
    expect(second).toBe(first);
  });

  it('changes the key when the version token is bumped', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const before = await keyspace.key(ORDERS, { page: 1 });
    await keyspace.bump(ORDERS);
    await expect(keyspace.key(ORDERS, { page: 1 })).resolves.not.toBe(before);
  });

  it('keeps namespaces that contain ":" apart from their segments', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const joined = await keyspace.key(['a:b'], {});
    const split = await keyspace.key(['a', 'b'], {});
    expect(joined).not.toBe(split);
  });

  it.each([
    ['a Date', { at: new Date('2025-01-01T00:00:00.000Z') }],
    ['a Map', { entries: new Map([['k', 'v']]) }],
    ['a cycle', CyclicValue.params()],
  ])('rejects params that hold %s as non JSON', async (_label, params) => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    await expect(keyspace.key(ORDERS, params)).rejects.toMatchObject({
      code: PrimitivesErrorCode.NonJsonValue,
    });
  });

  it('replaces a corrupt version token with a valid one', async () => {
    const cache = new InMemoryCache({ clock: new SystemClock() });
    const keyspace = new VersionedKeyspace(cache, {
      ids: new SequentialIdGenerator(),
    });
    await cache.set('cache:ver:t1:orders', 'corrupt');
    const token = await keyspace.version(ORDERS);
    expect(token).not.toBe('corrupt');
    await expect(keyspace.version(ORDERS)).resolves.toBe(token);
  });

  it('makes concurrent first readers agree on one token', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const tokens = await Promise.all([
      keyspace.version(ORDERS),
      keyspace.version(ORDERS),
      keyspace.version(ORDERS),
    ]);
    expect(new Set(tokens).size).toBe(1);
  });

  it('rejects a key longer than the configured limit', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        maxKeyLength: 20,
        ids: new SequentialIdGenerator(),
      },
    );
    await expect(keyspace.key(ORDERS, { page: 1 })).rejects.toBeInstanceOf(
      CacheKeyTooLongError,
    );
  });

  it.each(['', 'a:b'])('rejects the prefix %p', (prefix) => {
    expect(
      () =>
        new VersionedKeyspace(new InMemoryCache({ clock: new SystemClock() }), {
          ids: new UuidV7IdGenerator(
            new SystemClock(),
            new SystemRandomSource(),
          ),
          prefix,
        }),
    ).toThrow(
      expect.objectContaining({ code: CacheErrorCode.InvalidArgument }),
    );
  });

  it('digests params with the canonical JSON of primitives', async () => {
    const keyspace = new VersionedKeyspace(
      new InMemoryCache({ clock: new SystemClock() }),
      {
        ids: new SequentialIdGenerator(),
      },
    );
    const key = await keyspace.key(ORDERS, { page: 1 });
    expect(key.endsWith(CanonicalJson.digest({ page: 1 }))).toBe(true);
  });
});
