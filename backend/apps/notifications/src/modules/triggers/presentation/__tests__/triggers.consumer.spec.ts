import {
  SecurityAlertRaisedEvent,
  SecurityAlertType,
  type SecurityAlertRaisedPayload,
} from '@contracts/identity';
import { NotificationsEvent, NotificationType } from '@contracts/notifications';
import { DispatchOutcome, type MessageDispatcher } from '@platform/messaging';
import { DispatchHarness } from '../../../dispatch/__tests__/utils/index.js';
import { TenantMembers } from '../../application/tenant-members.js';
import { TriggerNotifications } from '../../application/trigger-notifications.js';
import { TriggersConsumer } from '../triggers.consumer.js';
import { ConsumerDispatcher, PlacedTenants } from './utils/index.js';

class NoMembers extends TenantMembers {
  override async withPermission() {
    return [];
  }
}

const ALERT: SecurityAlertRaisedPayload = {
  alertId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  userId: DispatchHarness.ANA.userId,
  type: SecurityAlertType.NewDeviceSignIn,
  raisedAt: '2026-11-20T10:00:00.000Z',
};

const alertDelivery = (tenantid: string | undefined): unknown => ({
  specversion: '1.0',
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e01',
  type: SecurityAlertRaisedEvent.type,
  source: 'identity',
  time: '2026-11-20T10:00:00.000Z',
  datacontenttype: 'application/json',
  ...(tenantid === undefined ? {} : { tenantid }),
  data: ALERT,
});

function setup(): { harness: DispatchHarness; dispatcher: MessageDispatcher } {
  const harness = new DispatchHarness();
  const consumer = new TriggersConsumer(
    new TriggerNotifications(
      harness.facade,
      harness.recipients,
      new NoMembers(),
    ),
  );
  const dispatcher = ConsumerDispatcher.create(
    new PlacedTenants(DispatchHarness.ANA.homeTenantId),
  );
  dispatcher.register(SecurityAlertRaisedEvent, (data, envelope) =>
    consumer.onSecurityAlert(data, envelope),
  );
  return { harness, dispatcher };
}

describe('TriggersConsumer through the message dispatcher', () => {
  it('notifies a security alert published in the home tenant of its user', async () => {
    const { harness, dispatcher } = setup();

    const result = await dispatcher.dispatch(
      alertDelivery(DispatchHarness.ANA.homeTenantId),
      { receiveCount: 1 },
    );

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect([...harness.inbox.stored.values()]).toEqual([
      expect.objectContaining({
        userId: DispatchHarness.ANA.userId,
        type: NotificationType.SecurityAlert,
      }),
    ]);
    expect(harness.bus.messages).toEqual([
      expect.objectContaining({
        type: NotificationsEvent.NotificationCreated,
        tenantId: DispatchHarness.ANA.homeTenantId,
      }),
    ]);
  });

  it('sends an alert without a tenant to the dead-letter queue instead of notifying it', async () => {
    const { harness, dispatcher } = setup();

    const result = await dispatcher.dispatch(alertDelivery(undefined), {
      receiveCount: 1,
    });

    expect(result.outcome).toBe(DispatchOutcome.DeadLetter);
    expect(harness.inbox.stored.size).toBe(0);
  });

  it('notifies once when the same alert is delivered twice at the same time', async () => {
    const { harness, dispatcher } = setup();
    const delivery = alertDelivery(DispatchHarness.ANA.homeTenantId);

    const results = await Promise.all([
      dispatcher.dispatch(delivery, { receiveCount: 1 }),
      dispatcher.dispatch(delivery, { receiveCount: 1 }),
    ]);

    expect(
      results.filter((result) => result.outcome === DispatchOutcome.Processed),
    ).toHaveLength(1);
    expect(harness.inbox.stored.size).toBe(1);
    expect(
      harness.bus.messages.filter(
        (message) => message.type === NotificationsEvent.NotificationCreated,
      ),
    ).toHaveLength(1);
  });
});
