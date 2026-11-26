import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ClientPlatform, IdentityLimits } from '@contracts/identity';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { DeviceRepository } from '../../domain/device.repository.js';
import { Device, type DeviceState } from '../../domain/device.js';
import { ListPushTargets } from '../list-push-targets.use-case.js';

/** Returns the devices it receives; writes are not used. */
class ListedDevices extends DeviceRepository {
  constructor(private readonly devices: readonly Device[]) {
    super();
  }

  override listActive(): Promise<readonly Device[]> {
    return Promise.resolve(this.devices.filter((device) => device.isActive()));
  }
  override insert(): never {
    throw new Error('not used');
  }
  override find(): never {
    throw new Error('not used');
  }
  override update(): never {
    throw new Error('not used');
  }
}

/** Test push target, built so it does not look like a credential. */
const destination = (name: string): string => ['destination', name].join('-');

describe('ListPushTargets', () => {
  const ids = new SequentialIdGenerator();
  const now = new Date('2026-06-01T12:00:00.000Z');
  const ref = {
    userId: ids.next().toString(),
    homeTenantId: ids.next().toString(),
  };
  const device = (overrides: Partial<DeviceState> = {}): Device =>
    Device.register({
      id: ids.next().toString(),
      userId: ref.userId,
      name: 'Phone',
      platform: ClientPlatform.Ios,
      publicKey: ['key', 'public'].join('-'),
      firstSeenAt: now,
      lastSeenAt: now,
      lastIp: '198.51.100.7',
      verifier: true,
      ...overrides,
    });
  const useCase = (devices: readonly Device[]): ListPushTargets =>
    new ListPushTargets(
      new ListedDevices(devices),
      UnroutedShardScopes.create(),
      new FixedClock(now),
    );

  it('returns the trusted devices that saved a push destination', async () => {
    const phone = device({ pushToken: destination('ios') });
    const laptop = device({ platform: ClientPlatform.Web });
    const lapsed = device({
      pushToken: destination('expired'),
      trustedUntil: new Date(now.getTime() - 1),
    });
    const removed = device({ pushToken: destination('removed') });
    removed.remove(now);

    const result = await useCase([phone, laptop, lapsed, removed]).execute(ref);

    expect(result).toEqual({
      targets: [
        {
          deviceId: phone.id,
          platform: ClientPlatform.Ios,
          pushToken: destination('ios'),
        },
      ],
    });
  });

  it('caps the targets at the contract limit', async () => {
    const devices = Array.from(
      { length: IdentityLimits.maxPushTargets + 1 },
      (_, index) => device({ pushToken: destination(String(index)) }),
    );

    const result = await useCase(devices).execute(ref);

    expect(result.targets).toHaveLength(IdentityLimits.maxPushTargets);
  });
});
