import { ClientPlatform, type PushTarget } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';
import { PushOutcome } from '../domain/push-outcome.enum.js';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { InMemoryPushSender } from '../infrastructure/in-memory-push-sender.js';
import { NonePushSender } from '../infrastructure/none-push-sender.js';
import { DeliverPush } from '../application/deliver-push.use-case.js';

const ANA: UserRef = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
};

class FixedTargets extends PushTargetDirectory {
  constructor(private readonly targets: readonly PushTarget[]) {
    super();
  }

  override async targetsOf(): Promise<readonly PushTarget[]> {
    return this.targets;
  }
}

const message = {
  notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
  title: 'Factura emitida',
  body: 'Se emitió la factura F-0042.',
};

const targets: PushTarget[] = [
  {
    deviceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f21',
    platform: ClientPlatform.Ios,
    pushToken: 'device-ios',
  },
  {
    deviceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f22',
    platform: ClientPlatform.Android,
    pushToken: 'device-android',
  },
];

describe('DeliverPush', () => {
  it('sends the message to every registered device of the user', async () => {
    const sender = new InMemoryPushSender();

    const outcome = await new DeliverPush(
      new FixedTargets(targets),
      sender,
    ).deliver(ANA, message);

    expect(outcome).toBe(PushOutcome.Sent);
    expect(sender.sent).toEqual(targets.map((target) => ({ target, message })));
  });

  it('sends nothing to a user without devices', async () => {
    const sender = new InMemoryPushSender();

    const outcome = await new DeliverPush(new FixedTargets([]), sender).deliver(
      ANA,
      message,
    );

    expect(outcome).toBe(PushOutcome.Sent);
    expect(sender.sent).toEqual([]);
  });

  it('skips the push when the none sender delivers to none of the devices', async () => {
    await expect(
      new DeliverPush(new FixedTargets(targets), new NonePushSender()).deliver(
        ANA,
        message,
      ),
    ).resolves.toBe(PushOutcome.Skipped);
  });
});
