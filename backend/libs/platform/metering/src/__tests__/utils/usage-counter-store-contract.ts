import { UsageMetric } from '@contracts/billing';
import type { UsageCounterStore } from '../../usage-counter-store.js';

const TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';

/**
 * What every `UsageCounterStore` satisfies. Each test uses its own windows, so the factory can share
 * state between tests.
 */
export function runUsageCounterStoreContract(
  name: string,
  factory: () => UsageCounterStore,
): void {
  describe(`${name} (UsageCounterStore contract)`, () => {
    let windowCount = 0;
    const base = Date.UTC(2026, 10, 20, 10, 0);
    const window = (): Date => {
      windowCount += 2;
      return new Date(base + windowCount * 60_000);
    };

    it('adds up what each tenant consumed of each metric in a window', async () => {
      const store = factory();
      const start = window();
      await store.add(start, TENANT_A, UsageMetric.ApiCalls, 2);
      await store.add(start, TENANT_A, UsageMetric.ApiCalls, 3);
      await store.add(start, TENANT_B, UsageMetric.ApiCalls, 1);

      const pending = await store.pending(new Date(start.getTime() + 1));

      expect(
        pending.find((w) => w.start.getTime() === start.getTime()),
      ).toEqual({
        start,
        counts: expect.arrayContaining([
          { tenantId: TENANT_A, metric: UsageMetric.ApiCalls, quantity: 5 },
          { tenantId: TENANT_B, metric: UsageMetric.ApiCalls, quantity: 1 },
        ]),
      });
    });

    it('lists only the windows that started before the limit, oldest first', async () => {
      const store = factory();
      const older = window();
      const newer = new Date(older.getTime() + 60_000);
      await store.add(newer, TENANT_A, UsageMetric.ApiCalls, 1);
      await store.add(older, TENANT_A, UsageMetric.ApiCalls, 1);

      const pending = await store.pending(newer);
      const both = await store.pending(new Date(newer.getTime() + 1));

      expect(pending.map((w) => w.start.getTime())).toContain(older.getTime());
      expect(pending.map((w) => w.start.getTime())).not.toContain(
        newer.getTime(),
      );
      const starts = both.map((w) => w.start.getTime());
      expect(starts.indexOf(older.getTime())).toBeLessThan(
        starts.indexOf(newer.getTime()),
      );
    });

    it('forgets a cleared window', async () => {
      const store = factory();
      const start = window();
      await store.add(start, TENANT_A, UsageMetric.ApiCalls, 4);

      await store.clear(start);

      const pending = await store.pending(new Date(start.getTime() + 1));
      expect(pending.map((w) => w.start.getTime())).not.toContain(
        start.getTime(),
      );
    });
  });
}
