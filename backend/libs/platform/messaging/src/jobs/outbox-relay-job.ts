import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { RelayScopes } from '../relay/relay-scopes.js';
import { MessagingJob } from './messaging-job.enum.js';

/**
 * Publica el outbox: una pasada del relay por cada partición que entrega
 * `RelayScopes`. Corre cada segundo con jitter y, además, `OutboxMessageBus`
 * pide una corrida con `JobRunner.trigger` al confirmarse una transacción.
 * No es exclusivo: el outbox toma los registros con lease y `SKIP LOCKED`.
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
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.scopes.forEach(async () => {
      await this.relay.relayOnce();
    });
  }
}
