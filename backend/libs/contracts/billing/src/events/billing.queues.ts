import { defineQueue } from '@contracts/platform';
import {
  IdentityEventsTopic,
  MembershipChangedEvent,
} from '@contracts/identity';
import { BillingQueue } from '../enums/identifiers.enum.js';
import { RecordUsageCommand } from './billing.commands.js';

/**
 * FIFO queue of usage records. The message group is the tenant, so the
 * batches of the same tenant are applied in order.
 */
export const UsageQueue = defineQueue({
  name: BillingQueue.Usage,
  fifo: true,
  commands: [RecordUsageCommand],
  description: 'Usage batches sent by the metering services.',
});

/** Membership changes from identity, for the count of billable users. */
export const IdentityEventsQueue = defineQueue({
  name: BillingQueue.Identity,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [MembershipChangedEvent],
    },
  ],
  description: 'Membership changes that feed the billable user count.',
});
