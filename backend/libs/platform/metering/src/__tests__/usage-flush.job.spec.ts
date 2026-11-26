import { ConsistentHashStrategy } from '@platform/sharding';
import { BillingCommand, UsageMetric } from '@contracts/billing';
import type { CommandDefinition } from '@contracts/platform';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
  SilentLogger,
} from '@platform/messaging/test-utils';
import type { MessageInput, SendOptions } from '@platform/messaging';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { BufferedUsageRecorder } from '../buffered-usage-recorder.js';
import { InMemoryUsageCounterStore } from '../in-memory-usage-counter-store.js';
import { UsageFlushJob } from '../usage-flush.job.js';
import { UsageWindowClock } from '../usage-window-clock.js';

const TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
const MINUTE = 60_000;

/** Bus that goes down for one tenant, like a shard that does not respond. */
class FailingFor extends RecordingMessageBus {
  constructor(
    transactions: InMemoryTransactionManager,
    private readonly tenantId: string,
  ) {
    super(transactions);
  }

  override send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ) {
    if (options?.tenantId === this.tenantId) {
      return Promise.reject(new Error('shard unavailable'));
    }
    return super.send(command, data, options);
  }
}

const setup = (failingTenant?: string) => {
  const clock = new FixedClock(new Date('2026-11-20T10:00:30.000Z'));
  const transactions = new InMemoryTransactionManager();
  const bus =
    failingTenant === undefined
      ? new RecordingMessageBus(transactions)
      : new FailingFor(transactions, failingTenant);
  const counters = new InMemoryUsageCounterStore();
  const windows = new UsageWindowClock(clock);
  const job = new UsageFlushJob({
    service: 'tasks',
    counters,
    windows,
    bus,
    transactions,
    scope: new ShardScope(
      new ShardRouter({
        strategy: new ConsistentHashStrategy(),
        directory: new InMemoryDirectoryStore(),
        clock,
      }),
    ),
    context: new RequestContextStore(new Tracing(new Redactor())),
    logger: new SilentLogger(),
  });
  return {
    bus,
    clock,
    counters,
    job,
    recorder: new BufferedUsageRecorder(counters, windows),
  };
};

describe('UsageFlushJob', () => {
  it('sends one usage command per tenant for a closed window, keyed by service, tenant, metric and window', async () => {
    const { bus, clock, job, recorder } = setup();
    await recorder.record(TENANT_A, UsageMetric.ApiCalls);
    await recorder.record(TENANT_A, UsageMetric.ApiCalls);
    await recorder.record(TENANT_B, UsageMetric.ApiCalls);
    clock.advance(2 * MINUTE);

    await job.run();

    expect(bus.messages).toEqual([
      {
        type: BillingCommand.RecordUsage,
        tenantId: TENANT_A,
        data: {
          tenantId: TENANT_A,
          records: [
            {
              metric: UsageMetric.ApiCalls,
              quantity: 2,
              windowStart: '2026-11-20T10:00:00.000Z',
              key: `tasks:${TENANT_A}:api_calls:2026-11-20T10:00:00.000Z`,
            },
          ],
        },
      },
      expect.objectContaining({
        tenantId: TENANT_B,
        data: expect.objectContaining({
          records: [expect.objectContaining({ quantity: 1 })],
        }),
      }),
    ]);
  });

  it('sends a window once: the next run finds nothing pending', async () => {
    const { bus, clock, job, recorder } = setup();
    await recorder.record(TENANT_A, UsageMetric.ApiCalls);
    clock.advance(2 * MINUTE);

    await job.run();
    await job.run();

    expect(bus.messages).toHaveLength(1);
  });

  it('waits one more minute before sending the window that just closed', async () => {
    const { bus, clock, job, recorder } = setup();
    await recorder.record(TENANT_A, UsageMetric.ApiCalls);
    clock.advance(MINUTE);

    await job.run();

    expect(bus.messages).toEqual([]);
  });

  it('keeps the window for the next run when a tenant could not be sent', async () => {
    const { bus, clock, counters, job, recorder } = setup(TENANT_B);
    await recorder.record(TENANT_A, UsageMetric.ApiCalls);
    await recorder.record(TENANT_B, UsageMetric.ApiCalls);
    clock.advance(2 * MINUTE);

    await job.run();

    expect(bus.messages.map((message) => message.tenantId)).toEqual([TENANT_A]);
    await expect(counters.pending(clock.now())).resolves.toHaveLength(1);
  });
});
