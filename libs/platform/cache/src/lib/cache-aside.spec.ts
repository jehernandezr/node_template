import type { CachePort } from './cache-port.js';
import { CacheAside } from './cache-aside.js';
import { InMemoryCache } from './in-memory-cache.js';
import { SingleFlight } from './single-flight.js';
import { VersionedKeyspace } from './versioned-keyspace.js';

interface SetupOptions {
  onError?: (error: unknown) => void;
  timeoutMs?: number;
}

function setup(
  cache: CachePort = new InMemoryCache(),
  options: SetupOptions = {},
) {
  const keyspace = new VersionedKeyspace(cache);
  const aside = new CacheAside(cache, keyspace, {
    random: () => 0,
    onError: options.onError,
    timeoutMs: options.timeoutMs,
  });
  return { cache, keyspace, aside };
}

const namespace = ['t1', 'orders'];
const failure = new Error('valkey unavailable');

function brokenCache(): CachePort {
  const fail = async (): Promise<never> => {
    throw failure;
  };
  return { get: fail, set: fail, setIfAbsent: fail, delete: fail, incr: fail };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('CacheAside', () => {
  it('loads once and serves later reads from the cache', async () => {
    const { aside } = setup();
    const load = jest.fn(async () => ({ id: 1 }));

    const first = await aside.getOrLoad({
      namespace,
      params: { id: 1 },
      ttlMs: 1000,
      load,
    });
    await sleep(5);
    const second = await aside.getOrLoad({
      namespace,
      params: { id: 1 },
      ttlMs: 1000,
      load,
    });

    expect(first).toEqual({ id: 1 });
    expect(second).toEqual({ id: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('expires entries using the jittered TTL with a fake clock', async () => {
    let now = 0;
    const cache = new InMemoryCache({ clock: () => now });
    const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
      random: () => 0,
    });
    const load = jest.fn(async () => 'v');
    const options = { namespace, params: {}, ttlMs: 1000, load };

    await aside.getOrLoad(options);
    await sleep(5);
    now = 899;
    await aside.getOrLoad(options);
    expect(load).toHaveBeenCalledTimes(1);

    now = 900;
    await aside.getOrLoad(options);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('deduplicates 10 concurrent misses into one load', async () => {
    const { aside } = setup();
    const load = jest.fn(async () => {
      await sleep(5);
      return 'data';
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        aside.getOrLoad({ namespace, params: { q: 1 }, ttlMs: 1000, load }),
      ),
    );

    expect(load).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result === 'data')).toBe(true);
  });

  it('shares a load error with all concurrent callers', async () => {
    const { aside } = setup();
    const load = jest.fn(async () => {
      await sleep(5);
      throw failure;
    });

    const outcomes = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        aside.getOrLoad({ namespace, params: {}, ttlMs: 1000, load }),
      ),
    );

    expect(load).toHaveBeenCalledTimes(1);
    expect(
      outcomes.every((o) => o.status === 'rejected' && o.reason === failure),
    ).toBe(true);
  });

  it('gives each concurrent waiter its own copy of the value', async () => {
    const { aside } = setup();
    const load = jest.fn(async () => {
      await sleep(5);
      return { items: [1] };
    });

    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        aside.getOrLoad({ namespace, params: {}, ttlMs: 1000, load }),
      ),
    );
    results[0].items.push(2);

    expect(new Set(results).size).toBe(3);
    expect(results[1].items).toEqual([1]);
    expect(results[2].items).toEqual([1]);
  });

  it('caches undefined and null results instead of reloading them', async () => {
    const { aside } = setup();
    const loadUndefined = jest.fn(async () => undefined);
    const loadNull = jest.fn(async () => null);

    expect(
      await aside.getOrLoad({
        namespace,
        params: 'u',
        ttlMs: 1000,
        load: loadUndefined,
      }),
    ).toBeUndefined();
    await sleep(5);
    expect(
      await aside.getOrLoad({
        namespace,
        params: 'u',
        ttlMs: 1000,
        load: loadUndefined,
      }),
    ).toBeUndefined();
    expect(loadUndefined).toHaveBeenCalledTimes(1);

    expect(
      await aside.getOrLoad({
        namespace,
        params: 'n',
        ttlMs: 1000,
        load: loadNull,
      }),
    ).toBeNull();
    await sleep(5);
    expect(
      await aside.getOrLoad({
        namespace,
        params: 'n',
        ttlMs: 1000,
        load: loadNull,
      }),
    ).toBeNull();
    expect(loadNull).toHaveBeenCalledTimes(1);
  });

  it('makes previous entries unreachable after invalidate', async () => {
    const { aside } = setup();
    const load = jest.fn(async () => 'v');

    await aside.getOrLoad({ namespace, params: {}, ttlMs: 1000, load });
    await sleep(5);
    await aside.invalidate(namespace);
    await aside.getOrLoad({ namespace, params: {}, ttlMs: 1000, load });

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not serve a value loaded before an invalidation that raced it', async () => {
    const { aside } = setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const oldLoad = jest.fn(async () => {
      await gate;
      return 'old';
    });

    const pending = aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: oldLoad,
    });
    await sleep(5);
    await aside.invalidate(namespace);
    release();
    expect(await pending).toBe('old');
    await sleep(5);

    const newLoad = jest.fn(async () => 'new');
    expect(
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: newLoad,
      }),
    ).toBe('new');
    expect(newLoad).toHaveBeenCalledTimes(1);
  });

  it('registers a second bump through afterCommit', async () => {
    const { aside, keyspace } = setup();
    const pending: Array<() => Promise<void>> = [];
    const before = await keyspace.version(namespace);

    await aside.invalidate(namespace, {
      afterCommit: (fn) => {
        pending.push(fn);
      },
    });
    const afterFirstBump = await keyspace.version(namespace);
    expect(afterFirstBump).not.toBe(before);
    expect(pending).toHaveLength(1);

    await pending[0]();
    expect(await keyspace.version(namespace)).not.toBe(afterFirstBump);
  });

  it('never resurrects old data when the version key is evicted', async () => {
    const { aside, cache } = setup();
    const oldLoad = jest.fn(async () => 'old');
    await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: oldLoad,
    });
    await sleep(5);

    await cache.delete('cache:ver:t1:orders');

    const newLoad = jest.fn(async () => 'new');
    expect(
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: newLoad,
      }),
    ).toBe('new');
    expect(newLoad).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache entirely inside a transaction', async () => {
    const cache = new InMemoryCache();
    const get = jest.spyOn(cache, 'get');
    const set = jest.spyOn(cache, 'set');
    const { aside } = setup(cache);
    const load = jest.fn(async () => 'fresh');

    await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load,
      inTransaction: true,
    });
    await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load,
      inTransaction: true,
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('falls back to the loader and reports when cache reads and writes fail', async () => {
    const onError = jest.fn();
    const { aside } = setup(brokenCache(), { onError });

    const value = await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: async () => 'db',
    });

    expect(value).toBe('db');
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('resolves invalidate while the cache is down and reports the failure', async () => {
    const onError = jest.fn();
    const { aside } = setup(brokenCache(), { onError });
    const pending: Array<() => Promise<void>> = [];

    await expect(
      aside.invalidate(namespace, {
        afterCommit: (fn) => {
          pending.push(fn);
        },
      }),
    ).resolves.toBeUndefined();
    await expect(pending[0]()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it('loads and reports when serialize throws, without caching the value', async () => {
    const onError = jest.fn();
    const { aside } = setup(new InMemoryCache(), { onError });
    const load = jest.fn(async () => 'db');
    const serialize = (): string => {
      throw failure;
    };

    expect(
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load,
        serialize,
      }),
    ).toBe('db');
    expect(onError).toHaveBeenCalledWith(failure);
    await sleep(5);
    expect(
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load,
        serialize,
      }),
    ).toBe('db');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('treats an undeserializable cached value as a miss and reports it', async () => {
    const cache = new InMemoryCache();
    const onError = jest.fn();
    const { aside, keyspace } = setup(cache, { onError });
    const key = await keyspace.key(namespace, {});
    await cache.set(key, '{not json', 1000);

    const value = await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: async () => ({ ok: true }),
    });

    expect(value).toEqual({ ok: true });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the loader when a cache call exceeds the timeout', async () => {
    const onError = jest.fn();
    const cache = new InMemoryCache();
    jest
      .spyOn(cache, 'get')
      .mockImplementation(
        () => new Promise<string | undefined>(() => undefined),
      );
    const { aside } = setup(cache, { onError, timeoutMs: 10 });

    const value = await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: async () => 'db',
    });

    expect(value).toBe('db');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'cache operation exceeded 10 ms' }),
    );
  });

  it('returns without waiting for a slow write and reports its timeout later', async () => {
    const onError = jest.fn();
    const cache = new InMemoryCache();
    jest
      .spyOn(cache, 'set')
      .mockImplementation(() => new Promise<void>(() => undefined));
    const { aside } = setup(cache, { onError, timeoutMs: 10 });

    expect(
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: async () => 'db',
      }),
    ).toBe('db');
    await sleep(30);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'cache operation exceeded 10 ms' }),
    );
  });

  it('shares a SingleFlight instance when one is provided', async () => {
    const cache = new InMemoryCache();
    const singleFlight = new SingleFlight();
    const run = jest.spyOn(singleFlight, 'run');
    const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
      singleFlight,
    });

    await aside.getOrLoad({
      namespace,
      params: {},
      ttlMs: 1000,
      load: async () => 1,
    });

    expect(run).toHaveBeenCalledTimes(1);
  });
});
