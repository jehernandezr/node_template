import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { OutboxMetric } from '../outbox/outbox-metric.enum.js';
import { OutboxRelay, type RelayReport } from '../outbox/outbox-relay.js';
import { RelayScopes } from '../relay/relay-scopes.js';
import { MessagingJob } from './messaging-job.enum.js';

/**
 * Publica el outbox: una pasada del relay por cada partición que entrega
 * `RelayScopes`. Corre cada segundo con jitter y, además, `OutboxMessageBus`
 * pide una corrida con `JobRunner.trigger` al confirmarse una transacción.
 * No es exclusivo: el outbox toma los registros con lease y `SKIP LOCKED`.
 * Cada pasada publica su `RelayReport` como contadores de `OutboxMetric`, para
 * alarmar sobre lo que falla o muere, y un registro dado por muerto se anota
 * como error.
 */
export class OutboxRelayJob extends ScheduledJob {
  readonly name = MessagingJob.OutboxRelay;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 1_000,
    jitterRatio: 0.2,
  };

  constructor(
    private readonly relay: OutboxRelay,
    private readonly scopes: RelayScopes,
    private readonly metrics?: MetricsPort,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  /** Una pasada del relay por partición, con su informe en métricas. */
  async run(): Promise<void> {
    await this.scopes.forEach(async () => {
      this.report(await this.relay.relayOnce());
    });
  }

  private report(report: RelayReport): void {
    const counts: ReadonlyArray<readonly [OutboxMetric, number]> = [
      [OutboxMetric.Published, report.published],
      [OutboxMetric.Failed, report.failed],
      [OutboxMetric.Dead, report.dead],
      [OutboxMetric.Deferred, report.deferred],
      [OutboxMetric.Stale, report.stale],
    ];
    for (const [metric, value] of counts) {
      if (value > 0) {
        this.metrics?.increment(metric, {}, value);
      }
    }
    if (report.dead > 0) {
      this.logger?.error('outbox records can never be delivered', {
        dead: report.dead,
      });
    }
  }
}
