import { defineTopic } from '@contracts/platform';
import { BillingTopic } from '../enums/identifiers.enum.js';
import {
  EntitlementsChangedEvent,
  InvoiceFailedEvent,
  InvoiceIssuedEvent,
  InvoicePaidEvent,
  SubscriptionChangedEvent,
  SubscriptionReactivatedEvent,
  SubscriptionSuspendedEvent,
} from './billing.events.js';

/** Topic of the billing events. Consumed by identity, notifications and reports, each in its own queue. */
export const BillingEventsTopic = defineTopic({
  name: BillingTopic.Events,
  events: [
    SubscriptionChangedEvent,
    SubscriptionSuspendedEvent,
    SubscriptionReactivatedEvent,
    EntitlementsChangedEvent,
    InvoiceIssuedEvent,
    InvoicePaidEvent,
    InvoiceFailedEvent,
  ],
  description:
    'Billing events: subscriptions, active features and invoices. Each service subscribes its own queue.',
});
