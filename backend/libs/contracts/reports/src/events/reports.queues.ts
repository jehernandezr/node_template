import { defineQueue } from '@contracts/platform';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
  TasksEventsTopic,
} from '@contracts/tasks';
import {
  BillingEventsTopic,
  InvoiceFailedEvent,
  InvoiceIssuedEvent,
  InvoicePaidEvent,
} from '@contracts/billing';
import { ReportsQueue } from '../enums/identifiers.enum.js';
import { ExecuteRunCommand } from './reports.commands.js';
import { NotificationsEventsReference } from './reports.references.js';

/** Ejecuciones de reporte pendientes. El cálculo puede tardar, por eso el plazo de visibilidad es largo. */
export const RunsQueue = defineQueue({
  name: ReportsQueue.Runs,
  visibilityTimeoutSeconds: 300,
  commands: [ExecuteRunCommand],
  description: 'Ejecuciones de reporte que reports se envía a sí mismo.',
});

/** Proyecciones de tareas que alimentan los reportes de tareas. */
export const ProjectionsQueue = defineQueue({
  name: ReportsQueue.Projections,
  subscriptions: [
    {
      topic: TasksEventsTopic,
      events: [TaskCreatedEvent, TaskUpdatedEvent, TaskDeletedEvent],
    },
  ],
  description:
    'Proyección de tareas por tenant, alimentada por los eventos de tasks.',
});

/** Proyecciones de facturas y entregas que alimentan los reportes financieros. */
export const FinanceProjectionsQueue = defineQueue({
  name: ReportsQueue.FinanceProjections,
  subscriptions: [
    {
      topic: BillingEventsTopic,
      events: [InvoiceIssuedEvent, InvoicePaidEvent, InvoiceFailedEvent],
    },
    {
      topic: NotificationsEventsReference,
      events: NotificationsEventsReference.events,
    },
  ],
  description:
    'Proyección de facturas y entregas, alimentada por billing y notifications.',
});
