import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { NotificationsJob } from '../../../shared/enums/notifications-job.enum.js';
import { DeliveryRepository } from '../domain/delivery.repository.js';
import { DeliveryStatus } from '../domain/delivery.js';
import { FailedDeliveries } from '../domain/failed-deliveries.js';
import { RecipientDirectory } from '../domain/recipient-directory.js';
import { ChannelDeliverer } from './channel-deliverer.js';

/** Retries the email and push deliveries whose next attempt is due, one batch per run. */
@Injectable()
export class RetryDeliveriesJob extends ScheduledJob {
  private static readonly EVERY_MS = 60_000;
  private static readonly BATCH = 100;

  readonly name = NotificationsJob.RetryDeliveries;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: RetryDeliveriesJob.EVERY_MS,
  };
  override readonly exclusive = true;

  constructor(
    private readonly failed: FailedDeliveries,
    private readonly recipients: RecipientDirectory,
    private readonly deliverer: ChannelDeliverer,
    private readonly deliveries: DeliveryRepository,
    private readonly shard: ShardScopes,
    private readonly clock: Clock,
  ) {
    super();
  }

  override async run(): Promise<void> {
    for (const delivery of await this.failed.due(
      this.clock.now(),
      RetryDeliveriesJob.BATCH,
    )) {
      const ref = {
        userId: delivery.userId,
        homeTenantId: delivery.homeTenantId,
      };
      const recipient = await this.recipients.find(delivery.userId);
      const result =
        recipient === undefined
          ? { ...delivery, status: DeliveryStatus.Abandoned }
          : await this.deliverer.deliver(delivery, recipient);
      await this.shard.inUserShard(ref, () => this.deliveries.save(result));
    }
  }
}
