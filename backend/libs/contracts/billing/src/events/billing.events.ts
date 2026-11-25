import { defineEvent } from '@contracts/platform';
import { BillingEvent } from '../enums/identifiers.enum.js';
import {
  EntitlementsChangedPayloadSchema,
  InvoiceFailedPayloadSchema,
  InvoiceIssuedPayloadSchema,
  InvoicePaidPayloadSchema,
  SubscriptionChangedPayloadSchema,
  SubscriptionReactivatedPayloadSchema,
  SubscriptionSuspendedPayloadSchema,
} from '../schemas/event.schema.js';

export const SubscriptionChangedEvent = defineEvent({
  type: BillingEvent.SubscriptionChanged,
  payload: SubscriptionChangedPayloadSchema,
  description: 'The plan of a tenant subscription changed.',
});

export const SubscriptionSuspendedEvent = defineEvent({
  type: BillingEvent.SubscriptionSuspended,
  payload: SubscriptionSuspendedPayloadSchema,
  description: 'A tenant subscription was suspended. Identity suspends access.',
});

export const SubscriptionReactivatedEvent = defineEvent({
  type: BillingEvent.SubscriptionReactivated,
  payload: SubscriptionReactivatedPayloadSchema,
  description: 'A tenant subscription was reactivated.',
});

export const EntitlementsChangedEvent = defineEvent({
  type: BillingEvent.EntitlementsChanged,
  payload: EntitlementsChangedPayloadSchema,
  description:
    'The active features and quotas of a tenant changed. Identity reflects them in the permissions.',
});

export const InvoiceIssuedEvent = defineEvent({
  type: BillingEvent.InvoiceIssued,
  payload: InvoiceIssuedPayloadSchema,
  description: 'An invoice was issued.',
});

export const InvoicePaidEvent = defineEvent({
  type: BillingEvent.InvoicePaid,
  payload: InvoicePaidPayloadSchema,
  description: 'An invoice was paid.',
});

export const InvoiceFailedEvent = defineEvent({
  type: BillingEvent.InvoiceFailed,
  payload: InvoiceFailedPayloadSchema,
  description: 'Charging an invoice failed.',
});
