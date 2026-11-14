import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { Deadline, PrimitivesErrorCode } from '@platform/primitives';
import { CircuitOpenError } from '@platform/resilience';
import { CacheAside } from '../cache-aside.js';
import { CacheErrorCode } from '../errors/cache-error-code.enum.js';
import { AsideHarness } from './utils/aside-harness.js';
import { CountingLoader } from './utils/counting-loader.js';

const ORDERS = ['t1', 'orders'];
const PARAMS = { page: 1 };

describe('CacheAside failures', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('serves the value from the loader and reports when the cache is down', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    harness.cache.fail(new Error('cache down'));

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      }),
    ).resolves.toBe('value');

    expect(harness.reporter.errors[0]).toMatchObject({ message: 'cache down' });
  });

  it('serves the value from the loader when the circuit is open', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    harness.resilience.failWith(new CircuitOpenError('cache', 'cache'));

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      }),
    ).resolves.toBe('value');

    expect(harness.reporter.errors[0]).toMatchObject({
      name: 'CircuitOpenError',
    });
  });

  it('serves an oversized value but never stores it', async () => {
    const harness = new AsideHarness();
    const big = 'x'.repeat(CacheAside.MAX_VALUE_BYTES);
    const loader = new CountingLoader(big);

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      }),
    ).resolves.toBe(big);
    await harness.settle();

    expect(harness.cache.sets).toBe(0);
    expect(harness.reporter.errors[0]).toMatchObject({
      code: CacheErrorCode.ValueTooLarge,
    });
  });

  it('serves a value that cannot be serialized and reports the failure', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader<bigint>(BigInt(7));

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      }),
    ).resolves.toBe(BigInt(7));

    expect(harness.reporter.errors).toHaveLength(1);
  });

  it.each(['not json', 'null'])(
    'loads again when the stored entry %p is corrupt',
    async (raw) => {
      const harness = new AsideHarness();
      const key = await harness.keyspace.key(ORDERS, PARAMS);
      await harness.cache.set(key, raw);
      const loader = new CountingLoader('fresh');

      await expect(
        harness.aside.getOrLoad({
          namespace: ORDERS,
          params: PARAMS,
          ttlMs: 5_000,
          load: loader.load,
        }),
      ).resolves.toBe('fresh');

      expect(harness.reporter.errors).toHaveLength(1);
    },
  );

  it('propagates a loader failure to the caller', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    loader.failWith(new Error('database down'));

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
      }),
    ).rejects.toThrow('database down');
  });

  it('rejects an aborted caller without loading', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const controller = new AbortController();
    controller.abort(new Error('client left'));

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
        signal: controller.signal,
      }),
    ).rejects.toThrow('client left');
    expect(loader.calls).toBe(0);
  });

  it('rejects a caller whose deadline already passed without loading', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const clock = new FixedClock();
    const deadline = Deadline.after(10, clock);
    clock.advance(10);

    await expect(
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
        deadline,
      }),
    ).rejects.toMatchObject({ code: PrimitivesErrorCode.DeadlineExceeded });
    expect(loader.calls).toBe(0);
  });

  it('lets a caller stop at its deadline while the shared load keeps running for others', async () => {
    jest.useFakeTimers();
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const release = loader.hold();
    const read = (deadline?: Deadline): Promise<string> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: PARAMS,
        ttlMs: 5_000,
        load: loader.load,
        deadline,
      });

    const impatient = read(Deadline.after(50, new SystemClock())).catch(
      (error: unknown) => error,
    );
    const patient = read();
    await harness.settle();
    await jest.advanceTimersByTimeAsync(50);

    await expect(impatient).resolves.toMatchObject({
      code: PrimitivesErrorCode.DeadlineExceeded,
    });
    release();
    await expect(patient).resolves.toBe('value');
    expect(loader.calls).toBe(1);
  });

  it('keeps invalidation from failing when the cache is down', async () => {
    const harness = new AsideHarness();
    harness.cache.fail(new Error('cache down'));

    await expect(harness.aside.invalidate(ORDERS)).resolves.toBeUndefined();
    expect(harness.reporter.errors).not.toHaveLength(0);
  });
});
