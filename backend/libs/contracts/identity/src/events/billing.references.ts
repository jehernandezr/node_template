import {
  defineCommandReference,
  defineTopicReference,
} from '@contracts/platform';
import { BillingReference } from '../enums/identifiers.enum.js';

/**
 * Tópico de billing con los eventos que identity consume. Se apunta por nombre
 * porque billing importa a identity (ver `BillingReference`).
 */
export const BillingEventsReference = defineTopicReference({
  name: BillingReference.Topic,
  events: [
    BillingReference.SubscriptionSuspended,
    BillingReference.SubscriptionReactivated,
    BillingReference.EntitlementsChanged,
  ],
  description: 'Eventos de billing que cambian el acceso de un tenant.',
});

/** Comando de billing con el que identity reporta su uso de API. */
export const RecordUsageReference = defineCommandReference({
  type: BillingReference.RecordUsage,
  description: 'Registra el uso de un tenant medido por identity.',
});
