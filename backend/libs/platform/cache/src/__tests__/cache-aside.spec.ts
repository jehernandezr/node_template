import { CountingLoader } from './utils/counting-loader.js';
import { AsideHarness } from './utils/aside-harness.js';

const ORDERS = ['t1', 'orders'];
const PARAMS = { page: 1 };

describe('CacheAside.getOrLoad', () => {
  it('loads on a miss and serves the next read from the cache', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader({ total: 3 });
    const read = (): Promise<{ total: number }> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      });

    await expect(read()).resolves.toEqual({ total: 3 });
    await harness.settle();
    await expect(read()).resolves.toEqual({ total: 3 });

    expect(loader.calls).toBe(1);
  });

  it('shares one load between concurrent reads of the same key', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const release = loader.hold();
    const read = (): Promise<string> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      });

    const first = read();
    const second = read();
    await harness.settle();
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([
      'value',
      'value',
    ]);
    expect(loader.calls).toBe(1);
  });

  it('caches null and undefined results instead of loading them again', async () => {
    const harness = new AsideHarness();
    const nullLoader = new CountingLoader<null>(null);
    const read = (): Promise<null> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: nullLoader.load,
      });

    await expect(read()).resolves.toBeNull();
    await harness.settle();
    await expect(read()).resolves.toBeNull();

    expect(nullLoader.calls).toBe(1);
  });

  it('stores the entry with a TTL jittered around the base', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    await harness.aside.getOrLoad({
      namespace: ORDERS,
      params: PARAMS,
      ttlMs: 1_000,
      load: loader.load,
    });
    await harness.settle();
    const key = await harness.keyspace.key(ORDERS, PARAMS);

    harness.clock.advance(999);
    await expect(harness.cache.get(key)).resolves.toBeDefined();
    harness.clock.advance(1);
    await expect(harness.cache.get(key)).resolves.toBeUndefined();
  });

  it('keeps different params under different entries', async () => {
    const harness = new AsideHarness();
    const first = new CountingLoader('first');
    const second = new CountingLoader('second');

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: { page: 1 },
        ttlMs: 5_000,
        load: first.load,
      }),
    ).resolves.toBe('first');
    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: { page: 2 },
        ttlMs: 5_000,
        load: second.load,
      }),
    ).resolves.toBe('second');
    expect([first.calls, second.calls]).toEqual([1, 1]);
  });
});
