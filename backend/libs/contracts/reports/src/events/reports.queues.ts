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

/** Pending report runs. The computation can take a while, which is why the visibility timeout is long. */
export const RunsQueue = defineQueue({
  name: ReportsQueue.Runs,
  visibilityTimeoutSeconds: 300,
  commands: [ExecuteRunCommand],
  description: 'Report runs that reports sends to itself.',
});

/** Task projections that feed the task reports. */
export const ProjectionsQueue = defineQueue({
  name: ReportsQueue.Projections,
  subscriptions: [
    {
      topic: TasksEventsTopic,
      events: [TaskCreatedEvent, TaskUpdatedEvent, TaskDeletedEvent],
    },
  ],
  description: 'Per-tenant task projection, fed by the tasks events.',
});

/** Invoice and delivery projections that feed the financial reports. */
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
    'Invoice and delivery projection, fed by billing and notifications.',
});
