import { SecurityAlertType } from '@contracts/identity';
import { NotificationsEvent, NotificationType } from '@contracts/notifications';
import type { SecurityAlertRaisedPayload } from '@contracts/identity';
import type { MessageEnvelope } from '@platform/messaging';
import { DispatchHarness } from '../../../dispatch/__tests__/utils/index.js';
import { TenantMembers } from '../../application/tenant-members.js';
import { TriggerNotifications } from '../../application/trigger-notifications.js';
import { TriggersConsumer } from '../triggers.consumer.js';

class NoMembers extends TenantMembers {
  async withPermission() {
    return [];
  }
}

const alertEnvelope = (
  data: SecurityAlertRaisedPayload,
): MessageEnvelope<SecurityAlertRaisedPayload> => ({
  specversion: '1.0',
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e01',
  type: 'identity.security-alert.raised.v1',
  source: 'identity',
  time: '2026-11-20T10:00:00.000Z',
  datacontenttype: 'application/json',
  data,
});

describe('TriggersConsumer', () => {
  it('notifies a security alert that carries no tenant in the home tenant of its user', async () => {
    const harness = new DispatchHarness();
    const consumer = new TriggersConsumer(
      new TriggerNotifications(
        harness.notifyUser,
        harness.recipients,
        new NoMembers(),
      ),
    );
    const alert = {
      alertId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
      userId: DispatchHarness.ANA.userId,
      type: SecurityAlertType.NewDeviceSignIn,
      raisedAt: '2026-11-20T10:00:00.000Z',
    };

    await consumer.onSecurityAlert(alert, alertEnvelope(alert));

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
        data: expect.objectContaining({
          tenantId: DispatchHarness.ANA.homeTenantId,
        }),
      }),
    ]);
  });
});
