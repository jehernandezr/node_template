import { Injectable } from '@nestjs/common';
import {
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { BillingJob } from '../../../shared/enums/billing-job.enum.js';
import { SubscriptionMaintenance } from '../domain/subscription-maintenance.js';
import { SubscriptionStanding } from './subscription-standing.js';

/**
 * Every hour suspends past-due subscriptions that exhausted `BILLING_GRACE_DAYS`. A failing tenant does not
 * stop the others: the next run picks it up.
 */
@Injectable()
export class AdvanceDunningJob extends ScheduledJob {
  readonly name = BillingJob.AdvanceDunning;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 60 * 60_000,
  };
  override readonly exclusive = true;

  constructor(
    private readonly maintenance: SubscriptionMaintenance,
    private readonly standing: SubscriptionStanding,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  override async run(): Promise<void> {
    for (const tenantId of await this.maintenance.pastDueBefore(
      this.standing.overdueCutoff(),
    )) {
      try {
        await this.standing.suspendIfOverdue(tenantId);
      } catch (error) {
        this.logger.error('overdue subscription not suspended', {
          tenantId,
          error,
        });
      }
    }
  }
}
