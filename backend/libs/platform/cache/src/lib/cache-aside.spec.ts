import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/testing';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import {
  CircuitOpenError,
  ResilienceEventKind,
  ResiliencePolicyName,
  ResilienceRegistry,
  ResilienceTimeoutError,
} from '@platform/resilience';
import {
  CacheCorruptEntryError,
  CacheInvalidArgumentError,
  CacheKeyTooLongError,
  CacheValueTooLargeError,
} from './errors.js';
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
  const resilience =
    options.timeoutMs === undefined
      ? undefined
      : new ResilienceRegistry({
          [ResiliencePolicyName.Cache]: { timeoutMs: options.timeoutMs },
        });
  const aside = new CacheAside(cache, keyspace, {
    random: () => 0,
    onError: options.onError,
    resilience,
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
    const clock = new FixedClock(new Date(0));
    const cache = new InMemoryCache({ clock });
    const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
      random: () => 0,
    });
    const load = jest.fn(async () => 'v');
    const options = { namespace, params: {}, ttlMs: 1000, load };

    await aside.getOrLoad(options);
    await sleep(5);
    clock.set(new Date(899));
    await aside.getOrLoad(options);
    expect(load).toHaveBeenCalledTimes(1);

    clock.set(new Date(900));
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
    expect(onError).toHaveBeenCalledWith(expect.any(ResilienceTimeoutError));
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
    expect(onError).toHaveBeenCalledWith(expect.any(ResilienceTimeoutError));
  });

  describe('resilience policy', () => {
    const unreachable = Object.assign(new Error('connect refused'), {
      code: 'ECONNREFUSED',
    });

    function unreachableCache(): CachePort & { calls: () => number } {
      let calls = 0;
      const fail = async (): Promise<never> => {
        calls += 1;
        throw unreachable;
      };
      return {
        get: fail,
        set: fail,
        setIfAbsent: fail,
        delete: fail,
        incr: fail,
        calls: () => calls,
      };
    }

    it('opens the cache breaker after repeated transient failures and stops calling the cache', async () => {
      const cache = unreachableCache();
      const registry = new ResilienceRegistry();
      const events: ResilienceEventKind[] = [];
      registry.onEvent((event) => {
        events.push(event.kind);
      });
      const onError = jest.fn();
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        resilience: registry,
        onError,
      });
      const read = () =>
        aside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load: async () => 'db',
        });

      // Five keyspace failures (the default threshold) open the circuit.
      for (let i = 0; i < 5; i += 1) {
        await expect(read()).resolves.toBe('db');
      }
      expect(events).toContain(ResilienceEventKind.Break);
      const callsWhenOpen = cache.calls();

      await expect(read()).resolves.toBe('db');
      expect(cache.calls()).toBe(callsWhenOpen);
      expect(onError).toHaveBeenLastCalledWith(expect.any(CircuitOpenError));
    });

    it('keeps one breaker per dependencyKey', async () => {
      const registry = new ResilienceRegistry();
      const broken = unreachableCache();
      const brokenAside = new CacheAside(
        broken,
        new VersionedKeyspace(broken),
        { resilience: registry, dependencyKey: 'valkey-a' },
      );
      for (let i = 0; i < 5; i += 1) {
        await brokenAside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load: async () => 'db',
        });
      }

      const healthy = new InMemoryCache();
      const get = jest.spyOn(healthy, 'get');
      const healthyAside = new CacheAside(
        healthy,
        new VersionedKeyspace(healthy),
        { resilience: registry, dependencyKey: 'valkey-b' },
      );
      await healthyAside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: async () => 'db',
      });
      expect(get).toHaveBeenCalled();
    });

    it('runs every cache call through the cache policy of the given registry', async () => {
      const registry = new ResilienceRegistry();
      const execute = jest.spyOn(registry, 'execute');
      const cache = new InMemoryCache();
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        resilience: registry,
        dependencyKey: 'valkey-main',
      });
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: async () => 'db',
      });
      await aside.invalidate(namespace);

      expect(execute).toHaveBeenCalled();
      for (const [name, , options] of execute.mock.calls) {
        expect(name).toBe(ResiliencePolicyName.Cache);
        expect(options).toEqual({ dependencyKey: 'valkey-main' });
      }
    });
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

  describe('caller deadline and abort', () => {
    it('lets one caller abort while the shared load serves the others', async () => {
      const { aside } = setup();
      let finish: (value: string) => void = () => undefined;
      const load = jest.fn(
        () =>
          new Promise<string>((resolve) => {
            finish = resolve;
          }),
      );
      const controller = new AbortController();
      const reason = new Error('client left');
      const base = { namespace, params: { id: 1 }, ttlMs: 1000, load };

      const leaver = aside.getOrLoad({ ...base, signal: controller.signal });
      const stayer = aside.getOrLoad(base);
      await sleep(5);
      controller.abort(reason);

      await expect(leaver).rejects.toBe(reason);
      finish('db');
      await expect(stayer).resolves.toBe('db');
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('rejects a caller whose deadline expires without failing the others', async () => {
      const { aside } = setup();
      const load = jest.fn(async () => {
        await sleep(40);
        return 'db';
      });
      const base = { namespace, params: { id: 2 }, ttlMs: 1000, load };

      const hurried = aside.getOrLoad({
        ...base,
        deadline: Deadline.after(10, new SystemClock()),
      });
      const patient = aside.getOrLoad(base);

      await expect(hurried).rejects.toBeInstanceOf(DeadlineExceededError);
      await expect(patient).resolves.toBe('db');
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('does not load for a caller that already gave up', async () => {
      const { aside } = setup();
      const load = jest.fn(async () => 'db');

      await expect(
        aside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load,
          deadline: Deadline.after(0, new FixedClock()),
        }),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
      await expect(
        aside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load,
          inTransaction: true,
          signal: AbortSignal.abort(new Error('gone')),
        }),
      ).rejects.toThrow('gone');
      expect(load).not.toHaveBeenCalled();
    });

    it('does not fall back to the loader after the caller aborted during a slow cache call', async () => {
      const cache = new InMemoryCache();
      jest
        .spyOn(cache, 'get')
        .mockImplementation(
          () => new Promise<string | undefined>(() => undefined),
        );
      const onError = jest.fn();
      const { aside } = setup(cache, { onError, timeoutMs: 1_000 });
      const load = jest.fn(async () => 'db');
      const controller = new AbortController();
      setTimeout(() => controller.abort(new Error('stop')), 10);

      await expect(
        aside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load,
          signal: controller.signal,
        }),
      ).rejects.toThrow('stop');
      expect(load).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('bounds', () => {
    it('serves but never stores a value above maxValueBytes', async () => {
      const cache = new InMemoryCache();
      const set = jest.spyOn(cache, 'set');
      const onError = jest.fn();
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        onError,
        maxValueBytes: 64,
      });
      const load = jest.fn(async () => 'x'.repeat(100));
      const options = { namespace, params: {}, ttlMs: 1000, load };

      expect(await aside.getOrLoad(options)).toBe('x'.repeat(100));
      await sleep(5);
      expect(await aside.getOrLoad(options)).toBe('x'.repeat(100));

      expect(load).toHaveBeenCalledTimes(2);
      expect(set).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(CacheValueTooLargeError));
    });

    it('counts UTF-8 bytes, not characters, against maxValueBytes', async () => {
      const cache = new InMemoryCache();
      const onError = jest.fn();
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        onError,
        maxValueBytes: 40,
      });

      // 15 characters, 45 bytes once encoded.
      await aside.getOrLoad({
        namespace,
        params: {},
        ttlMs: 1000,
        load: async () => '€'.repeat(15),
      });

      expect(onError).toHaveBeenCalledWith(expect.any(CacheValueTooLargeError));
    });

    it('falls back to the loader and reports a namespace that makes the key too long', async () => {
      const onError = jest.fn();
      const { aside } = setup(new InMemoryCache(), { onError });

      const value = await aside.getOrLoad({
        namespace: ['x'.repeat(2_000)],
        params: {},
        ttlMs: 1000,
        load: async () => 'db',
      });

      expect(value).toBe('db');
      expect(onError).toHaveBeenCalledWith(expect.any(CacheKeyTooLongError));
    });

    it('reports a corrupt envelope with CacheCorruptEntryError', async () => {
      const cache = new InMemoryCache();
      const onError = jest.fn();
      const { aside, keyspace } = setup(cache, { onError });
      await cache.set(await keyspace.key(namespace, {}), 'null', 1000);

      expect(
        await aside.getOrLoad({
          namespace,
          params: {},
          ttlMs: 1000,
          load: async () => 'db',
        }),
      ).toBe('db');
      expect(onError).toHaveBeenCalledWith(expect.any(CacheCorruptEntryError));
    });

    it('rejects invalid options', () => {
      const cache = new InMemoryCache();
      const keyspace = new VersionedKeyspace(cache);
      expect(
        () => new CacheAside(cache, keyspace, { maxValueBytes: 0 }),
      ).toThrow(CacheInvalidArgumentError);
    });
  });

  it('serves the committed value once invalidate resolves, under concurrent reads', async () => {
    for (let round = 0; round < 10; round += 1) {
      const { aside } = setup();
      let db = 1;
      const load = async (): Promise<number> => {
        const snapshot = db;
        await sleep(Math.floor(Math.random() * 5));
        return snapshot;
      };
      const read = (): Promise<number> =>
        aside.getOrLoad({ namespace, params: { q: 1 }, ttlMs: 10_000, load });

      const before = Array.from({ length: 10 }, () => read());
      await sleep(Math.floor(Math.random() * 3));
      db = 2;
      await aside.invalidate(namespace);
      const during = Array.from({ length: 10 }, () => read());
      await Promise.all([...before, ...during]);
      await sleep(5);

      // Readers that took the old token may have cached 1 under it; nobody
      // reading after the invalidation can reach that entry.
      expect(await Promise.all(during)).toEqual(Array(10).fill(2));
      expect(await read()).toBe(2);
    }
  });
});
