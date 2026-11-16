import { deliveredTypes, validateContract } from '@contracts/platform';
import { IdentityEvent } from '@contracts/identity';
import { TasksEvent } from '@contracts/tasks';
import { BillingEvent, RecordUsageCommand } from '@contracts/billing';
import { ReportsEvent } from '@contracts/reports';
import { notificationsContract } from '../contract.js';
import { NotificationsQueue } from '../enums/identifiers.enum.js';
import {
  NotificationCreatedEvent,
  NotificationsEventsTopic,
  RealtimeControlQueue,
  TriggersQueue,
} from '../events/index.js';
import { NotificationCreatedPayloadSchema } from '../schemas/event.schema.js';
import {
  NotificationChannel,
  NotificationType,
} from '../enums/notifications.enum.js';
import { Ids, Now } from './utils/fixtures.js';

describe('notifications events and queues', () => {
  it('publishes only the created notification on its topic', () => {
    expect(NotificationsEventsTopic.events).toEqual([NotificationCreatedEvent]);
  });

  it('names the queues with the notifications enum', () => {
    expect(TriggersQueue.name).toBe(NotificationsQueue.Triggers);
    expect(RealtimeControlQueue.name).toBe(NotificationsQueue.RealtimeControl);
  });

  it('delivers to the triggers queue exactly the five expected types', () => {
    expect([...deliveredTypes(TriggersQueue)].sort()).toEqual(
      [
        IdentityEvent.SecurityAlertRaised,
        IdentityEvent.MembershipChanged,
        TasksEvent.TaskUpdated,
        BillingEvent.InvoiceIssued,
        ReportsEvent.RunCompleted,
      ].sort(),
    );
  });

  it('delivers to the realtime control queue the session and token revocations', () => {
    expect([...deliveredTypes(RealtimeControlQueue)].sort()).toEqual(
      [IdentityEvent.SessionRevoked, IdentityEvent.TokensRevoked].sort(),
    );
  });

  it('registers the triggers queue in the contract', () => {
    expect(notificationsContract.queues.triggers).toBe(TriggersQueue);
    expect(notificationsContract.queues.realtimeControl).toBe(
      RealtimeControlQueue,
    );
  });

  it('validates a created payload without any text field', () => {
    const payload = {
      notificationId: Ids.item,
      tenantId: Ids.tenant,
      type: NotificationType.TaskUpdated,
      channels: [NotificationChannel.InApp],
      createdAt: Now,
    };
    expect(validateContract(NotificationCreatedPayloadSchema, payload).ok).toBe(
      true,
    );
    const shape = Object.keys(NotificationCreatedPayloadSchema.shape);
    expect(shape).not.toContain('title');
    expect(shape).not.toContain('body');
  });

  it('sends the usage record command to billing', () => {
    expect(notificationsContract.sends).toContain(RecordUsageCommand);
  });
});
