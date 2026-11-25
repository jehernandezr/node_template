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
 * Publishes the outbox: one relay pass for each partition that
 * `RelayScopes` yields. Runs every second with jitter and, in addition, `OutboxMessageBus`
 * requests a run with `JobRunner.trigger` when a transaction commits.
 * It is not exclusive: the outbox takes records with a lease and `SKIP LOCKED`.
 * Each pass publishes its `RelayReport` as `OutboxMetric` counters, to
 * alert on what fails or dies, and a record declared dead is logged
 * as an error.
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

  /** One relay pass per partition, with its report in metrics. */
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
