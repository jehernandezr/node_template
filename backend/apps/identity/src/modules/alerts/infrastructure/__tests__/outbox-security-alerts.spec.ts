import { IdentityEvent, SecurityAlertType } from '@contracts/identity';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import { TestShardScopes } from '../../../../__tests__/utils/index.js';
import { OutboxSecurityAlerts } from '../outbox-security-alerts.js';

const USER = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
};

describe('OutboxSecurityAlerts', () => {
  it('publishes the alert under the home tenant of the user, which is where consumers place it', async () => {
    const transactions = new InMemoryTransactionManager();
    const bus = new RecordingMessageBus(transactions);
    const alerts = new OutboxSecurityAlerts(
      bus,
      TestShardScopes.create(),
      transactions,
      new SequentialIdGenerator(),
      new FixedClock(),
    );

    await alerts.raise({ type: SecurityAlertType.NewDeviceSignIn, user: USER });

    expect(bus.messages).toEqual([
      expect.objectContaining({
        type: IdentityEvent.SecurityAlertRaised,
        tenantId: USER.homeTenantId,
        data: expect.objectContaining({
          userId: USER.userId,
          type: SecurityAlertType.NewDeviceSignIn,
        }),
      }),
    ]);
  });
});
