import { UsageMetric, type RecordUsagePayload } from '@contracts/billing';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import {
  InMemoryMemberRoster,
  InMemoryUsageLedger,
} from '../../__tests__/utils/index.js';
import { LocalUsageFacade } from '../local-usage.facade.js';
import { RecordUsage } from '../record-usage.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';

class UsageHarness {
  readonly ledger = new InMemoryUsageLedger();
  private readonly shard = UnroutedShardScopes.create();

  record(): RecordUsage {
    return new RecordUsage(
      this.ledger,
      this.shard,
      new InMemoryTransactionManager(),
      new SequentialIdGenerator(),
    );
  }

  levels(from: string, to: string) {
    return new LocalUsageFacade(
      this.ledger,
      new InMemoryMemberRoster(),
      this.shard,
    ).levels(TENANT, from, to);
  }
}

const batch = (
  ...records: [
    key: string,
    metric: UsageMetric,
    quantity: number,
    day: string,
  ][]
): RecordUsagePayload => ({
  tenantId: TENANT,
  records: records.map(([key, metric, quantity, day]) => ({
    key,
    metric,
    quantity,
    windowStart: `${day}T10:00:00.000Z`,
  })),
});

describe('RecordUsage', () => {
  it('adds up the api calls of a batch per period', async () => {
    const harness = new UsageHarness();

    const applied = await harness
      .record()
      .execute(
        batch(
          ['a', UsageMetric.ApiCalls, 40, '2026-11-02'],
          ['b', UsageMetric.ApiCalls, 2, '2026-11-03'],
        ),
      );

    expect(applied).toBe(2);
    await expect(
      harness.levels('2026-11-01', '2026-11-30'),
    ).resolves.toContainEqual({
      metric: UsageMetric.ApiCalls,
      used: 42,
    });
  });

  it('counts a batch that arrives again once, by the keys of its records', async () => {
    const harness = new UsageHarness();
    const usage = batch(['a', UsageMetric.ApiCalls, 40, '2026-11-02']);
    await harness.record().execute(usage);

    await expect(harness.record().execute(usage)).resolves.toBe(0);

    await expect(
      harness.levels('2026-11-01', '2026-11-30'),
    ).resolves.toContainEqual({
      metric: UsageMetric.ApiCalls,
      used: 40,
    });
  });

  it('counts a key once when two deliveries of it are applied at the same time', async () => {
    const harness = new UsageHarness();
    const usage = batch(
      ['a', UsageMetric.ApiCalls, 40, '2026-11-02'],
      ['b', UsageMetric.ApiCalls, 5, '2026-11-02'],
    );

    const applied = await Promise.all([
      harness.record().execute(usage),
      harness.record().execute(usage),
    ]);

    expect(applied.reduce((sum, count) => sum + count, 0)).toBe(2);
    await expect(
      harness.levels('2026-11-01', '2026-11-30'),
    ).resolves.toContainEqual({
      metric: UsageMetric.ApiCalls,
      used: 45,
    });
  });

  it('keeps the largest storage of the period instead of adding it up', async () => {
    const harness = new UsageHarness();

    await harness
      .record()
      .execute(
        batch(
          ['a', UsageMetric.StorageGb, 7, '2026-11-02'],
          ['b', UsageMetric.StorageGb, 3, '2026-11-09'],
        ),
      );

    await expect(
      harness.levels('2026-11-01', '2026-11-30'),
    ).resolves.toContainEqual({
      metric: UsageMetric.StorageGb,
      used: 7,
    });
  });

  it('leaves out of a period the usage recorded on other days', async () => {
    const harness = new UsageHarness();
    await harness
      .record()
      .execute(batch(['a', UsageMetric.ApiCalls, 9, '2026-10-31']));

    await expect(
      harness.levels('2026-11-01', '2026-11-30'),
    ).resolves.not.toContainEqual(
      expect.objectContaining({ metric: UsageMetric.ApiCalls }),
    );
  });
});
