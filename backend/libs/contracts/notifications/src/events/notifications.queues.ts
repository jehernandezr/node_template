import { defineQueue } from '@contracts/platform';
import {
  IdentityEventsTopic,
  MembershipChangedEvent,
  SecurityAlertRaisedEvent,
  SessionRevokedEvent,
  TokensRevokedEvent,
} from '@contracts/identity';
import { TasksEventsTopic, TaskUpdatedEvent } from '@contracts/tasks';
import { BillingEventsTopic, InvoiceIssuedEvent } from '@contracts/billing';
import { ReportsEventsTopic, RunCompletedEvent } from '@contracts/reports';
import { NotificationsQueue } from '../enums/identifiers.enum.js';

/**
 * Traduce eventos de otros servicios en notificaciones: alertas de seguridad,
 * cambios de membresía, tareas actualizadas, facturas emitidas y reportes listos.
 */
export const TriggersQueue = defineQueue({
  name: NotificationsQueue.Triggers,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [SecurityAlertRaisedEvent, MembershipChangedEvent],
    },
    {
      topic: TasksEventsTopic,
      events: [TaskUpdatedEvent],
    },
    {
      topic: BillingEventsTopic,
      events: [InvoiceIssuedEvent],
    },
    {
      topic: ReportsEventsTopic,
      events: [RunCompletedEvent],
    },
  ],
  description:
    'Convierte eventos de identity, tasks, billing y reports en notificaciones para sus destinatarios.',
});

/**
 * Cierra las conexiones de tiempo real cuando una sesión o un token se revoca,
 * para que el cliente no siga recibiendo tramas.
 */
export const RealtimeControlQueue = defineQueue({
  name: NotificationsQueue.RealtimeControl,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [SessionRevokedEvent, TokensRevokedEvent],
    },
  ],
  description:
    'Cierra las conexiones de tiempo real de las sesiones y tokens revocados.',
});
