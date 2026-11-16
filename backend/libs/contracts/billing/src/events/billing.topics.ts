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

/** Tópico de los eventos de billing. Lo consumen identity, notifications y reports, cada uno en su cola. */
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
    'Eventos de billing: suscripciones, funcionalidades vigentes y facturas. Cada servicio suscribe su propia cola.',
});
