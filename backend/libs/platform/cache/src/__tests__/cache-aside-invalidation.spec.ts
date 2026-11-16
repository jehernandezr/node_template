import { CountingLoader } from './utils/counting-loader.js';
import { AsideHarness } from './utils/aside-harness.js';

const ORDERS = ['t1', 'orders'];

describe('CacheAside.invalidate', () => {
  it('changes the version token once outside a transaction', async () => {
    const harness = new AsideHarness();
    const before = await harness.keyspace.version(ORDERS);

    await harness.aside.invalidate(ORDERS);

    const after = await harness.keyspace.version(ORDERS);
    expect(after).not.toBe(before);
    await harness.aside.invalidate(ORDERS);
    await expect(harness.keyspace.version(ORDERS)).resolves.not.toBe(after);
  });

  it('forces the next read to load again', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const read = (): Promise<string> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: { page: 1 },
        ttlMs: 5_000,
        load: loader.load,
      });

    await read();
    await harness.settle();
    await harness.aside.invalidate(ORDERS);
    await read();

    expect(loader.calls).toBe(2);
  });

  it('bumps the version before and after the commit, never during rollback', async () => {
    const harness = new AsideHarness();
    const before = await harness.keyspace.version(ORDERS);
    let during = '';

    await harness.transactions.runInTransaction(async () => {
      await harness.aside.invalidate(ORDERS);
      during = await harness.keyspace.version(ORDERS);
    });
    const after = await harness.keyspace.version(ORDERS);

    expect(new Set([before, during, after]).size).toBe(3);
  });

  it('bumps only once when the transaction rolls back after invalidating', async () => {
    const harness = new AsideHarness();
    let during = '';

    await expect(
      harness.transactions.runInTransaction(async () => {
        await harness.aside.invalidate(ORDERS);
        during = await harness.keyspace.version(ORDERS);
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');

    await expect(harness.keyspace.version(ORDERS)).resolves.toBe(during);
  });

  it('bypasses the cache inside a transaction and loads on every read', async () => {
    const harness = new AsideHarness();
    const loader = new CountingLoader('value');
    const read = (): Promise<string> =>
      harness.aside.getOrLoad({
        namespace: ORDERS,
        params: { page: 1 },
        ttlMs: 5_000,
        load: loader.load,
      });

    await harness.transactions.runInTransaction(async () => {
      await read();
      await read();
    });

    expect(loader.calls).toBe(2);
  });
});
