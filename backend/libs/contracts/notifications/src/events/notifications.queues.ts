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
 * Translates events from other services into notifications: security alerts,
 * membership changes, updated tasks, issued invoices and ready reports.
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
    'Turns identity, tasks, billing and reports events into notifications for their recipients.',
});

/**
 * Closes real-time connections when a session or a token is revoked,
 * so the client stops receiving frames.
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
    'Closes the realtime connections of revoked sessions and tokens.',
});
