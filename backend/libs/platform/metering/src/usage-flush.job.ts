import {
  RecordUsageCommand,
  UsageMetricSchema,
  type UsageRecord,
} from '@contracts/billing';
import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
  type TransactionManager,
} from '@platform/kernel';
import type { MessageBus } from '@platform/messaging';
import type { LoggerPort, RequestContextStore } from '@platform/observability';
import type { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import { MeteringJob } from './metering-job.enum.js';
import type { UsageCount, UsageWindow } from './usage-count.js';
import type { UsageCounterStore } from './usage-counter-store.js';
import { UsageWindowClock } from './usage-window-clock.js';

/** Con qué se arma `UsageFlushJob`. */
export interface UsageFlushJobCollaborators {
  /** Nombre del servicio que mide: encabeza la llave de idempotencia de cada registro. */
  readonly service: string;
  readonly counters: UsageCounterStore;
  readonly windows: UsageWindowClock;
  readonly bus: MessageBus;
  readonly transactions: TransactionManager;
  readonly scope: ShardScope;
  readonly context: RequestContextStore;
  readonly logger: LoggerPort;
}

/**
 * Cada minuto envía a billing, por el outbox del shard de cada tenant, un `billing.usage.record.v1` por
 * tenant y ventana cerrada, y olvida la ventana cuando todos sus tenants salieron. La llave de cada registro
 * es `<servicio>:<tenant>:<métrica>:<ventana>`: si el proceso cae antes de olvidarla, el reenvío no suma dos
 * veces en billing.
 */
export class UsageFlushJob extends ScheduledJob {
  readonly name = MeteringJob.FlushUsage;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: UsageWindowClock.WINDOW_MS,
  };
  override readonly exclusive = true;

  constructor(private readonly collaborators: UsageFlushJobCollaborators) {
    super();
  }

  async run(): Promise<void> {
    const { counters, windows } = this.collaborators;
    for (const window of await counters.pending(windows.closedBefore())) {
      if (await this.flush(window)) {
        await counters.clear(window.start);
      }
    }
  }

  /** Devuelve `false` si algún tenant no salió: la ventana se reintenta en la siguiente corrida. */
  private async flush(window: UsageWindow): Promise<boolean> {
    let complete = true;
    for (const [tenantId, counts] of UsageFlushJob.byTenant(window.counts)) {
      try {
        await this.send(tenantId, window.start, counts);
      } catch (error) {
        complete = false;
        this.collaborators.logger.error('usage window not sent', {
          tenantId,
          windowStart: window.start.toISOString(),
          error,
        });
      }
    }
    return complete;
  }

  private send(
    tenantId: string,
    windowStart: Date,
    counts: readonly UsageCount[],
  ): Promise<void> {
    const { bus, context, scope, transactions } = this.collaborators;
    const records = counts.map((count) => this.recordOf(count, windowStart));
    return context.run({ tenantId }, () =>
      scope.run({ tenantId, keyKind: ShardKey.Tenant }, () =>
        transactions.runInTransaction(async () => {
          await bus.send(
            RecordUsageCommand,
            { tenantId, records },
            { tenantId, groupId: tenantId },
          );
        }),
      ),
    );
  }

  /** @throws ZodError si la métrica no es del catálogo de billing: la ventana queda para revisarla. */
  private recordOf(count: UsageCount, windowStart: Date): UsageRecord {
    const window = windowStart.toISOString();
    return {
      metric: UsageMetricSchema.parse(count.metric),
      quantity: count.quantity,
      windowStart: window,
      key: `${this.collaborators.service}:${count.tenantId}:${count.metric}:${window}`,
    };
  }

  private static byTenant(
    counts: readonly UsageCount[],
  ): Map<string, UsageCount[]> {
    const grouped = new Map<string, UsageCount[]>();
    for (const count of counts) {
      grouped.set(count.tenantId, [
        ...(grouped.get(count.tenantId) ?? []),
        count,
      ]);
    }
    return grouped;
  }
}
