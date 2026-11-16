import { defineTopicReference } from '@contracts/platform';
import { NotificationsReference } from '../enums/identifiers.enum.js';

/**
 * Tópico de notifications con los mensajes que reports cuenta. Se apunta por
 * nombre porque notifications ya importa a reports y un contrato no puede
 * importar a quien lo importa.
 */
export const NotificationsEventsReference = defineTopicReference({
  name: NotificationsReference.Topic,
  events: [NotificationsReference.NotificationCreated],
  description:
    'Evento de notifications que reports cuenta para el reporte de entregas.',
});
