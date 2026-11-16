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
  description: 'Cambió el plan de la suscripción de un tenant.',
});

export const SubscriptionSuspendedEvent = defineEvent({
  type: BillingEvent.SubscriptionSuspended,
  payload: SubscriptionSuspendedPayloadSchema,
  description:
    'Se suspendió la suscripción de un tenant. Identity suspende el acceso.',
});

export const SubscriptionReactivatedEvent = defineEvent({
  type: BillingEvent.SubscriptionReactivated,
  payload: SubscriptionReactivatedPayloadSchema,
  description: 'Se reactivó la suscripción de un tenant.',
});

export const EntitlementsChangedEvent = defineEvent({
  type: BillingEvent.EntitlementsChanged,
  payload: EntitlementsChangedPayloadSchema,
  description:
    'Cambiaron las funcionalidades y cuotas vigentes de un tenant. Identity las refleja en los permisos.',
});

export const InvoiceIssuedEvent = defineEvent({
  type: BillingEvent.InvoiceIssued,
  payload: InvoiceIssuedPayloadSchema,
  description: 'Se emitió una factura.',
});

export const InvoicePaidEvent = defineEvent({
  type: BillingEvent.InvoicePaid,
  payload: InvoicePaidPayloadSchema,
  description: 'Se pagó una factura.',
});

export const InvoiceFailedEvent = defineEvent({
  type: BillingEvent.InvoiceFailed,
  payload: InvoiceFailedPayloadSchema,
  description: 'Falló el cobro de una factura.',
});
