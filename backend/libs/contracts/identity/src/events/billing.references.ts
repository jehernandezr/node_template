import {
  defineCommandReference,
  defineTopicReference,
} from '@contracts/platform';
import { BillingReference } from '../enums/identifiers.enum.js';

/**
 * Billing topic with the events identity consumes. It is referenced by name
 * because billing imports identity (see `BillingReference`).
 */
export const BillingEventsReference = defineTopicReference({
  name: BillingReference.Topic,
  events: [
    BillingReference.SubscriptionSuspended,
    BillingReference.SubscriptionReactivated,
    BillingReference.EntitlementsChanged,
  ],
  description: 'Billing events that change the access of a tenant.',
});

/** Billing command with which identity reports its API usage. */
export const RecordUsageReference = defineCommandReference({
  type: BillingReference.RecordUsage,
  description: 'Records the usage of a tenant metered by identity.',
});
