import { ClientPlatform, SecurityAlertType } from '@contracts/identity';
import { SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { DeviceKey } from '../../../__tests__/utils/index.js';
import {
  InMemoryEphemeralStore,
  TestShardScopes,
} from '../../../__tests__/utils/index.js';
import { InMemorySecurityAlerts } from '../../alerts/__tests__/utils/index.js';
import { TestLoginLockout } from '../../authentication/__tests__/utils/index.js';
import { InMemoryMfaFacade } from '../../mfa/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../users/__tests__/utils/index.js';
import { DeviceRepository } from '../domain/device.repository.js';
import { DeviceRoute } from '../domain/device-route.js';
import { Device } from '../domain/device.js';
import { EphemeralDeviceApprovalStore } from '../infrastructure/ephemeral-device-approval-store.js';
import { NodeDeviceSignatureVerifier } from '../infrastructure/node-device-signature-verifier.js';
import { DeviceApprovalsUseCase } from '../application/device-approvals.use-case.js';
import { SignedDeviceRequest } from '../application/signed-device-request.js';

/** Dispositivos en memoria, sin separar por usuario más que por la llave. */
class InMemoryDeviceRepository extends DeviceRepository {
  private readonly devices = new Map<string, Device>();

  async insert(device: Device): Promise<void> {
    this.devices.set(device.snapshot().id, device);
  }

  async find(userId: string, deviceId: string): Promise<Device | undefined> {
    const device = this.devices.get(deviceId);
    return device?.snapshot().userId === userId ? device : undefined;
  }

  async listActive(userId: string): Promise<readonly Device[]> {
    return [...this.devices.values()].filter(
      (device) => device.snapshot().userId === userId,
    );
  }

  async update(device: Device): Promise<void> {
    this.devices.set(device.snapshot().id, device);
  }
}

const DENY = 'identity.device-approvals.deny';
const HOME = '01890000-0000-7000-8000-00000000aaaa';
const ATTEMPT_IP = '192.0.2.44';
const CHALLENGE = '01890000-0000-7000-8000-0000000000c1';

describe('DeviceApprovalsUseCase deny', () => {
  const build = async () => {
    const clock = new SystemClock();
    const ephemeral = new InMemoryEphemeralStore(clock);
    const ids = new SequentialIdGenerator();
    const users = new InMemoryUsersFacade(ids);
    const devices = new InMemoryDeviceRepository();
    const approvals = new EphemeralDeviceApprovalStore(ephemeral);
    const scopes = TestShardScopes.create();
    const mfa = new InMemoryMfaFacade();
    const alerts = new InMemorySecurityAlerts();
    const { lockout, keys } = new TestLoginLockout(ephemeral, clock);
    const useCase = new DeviceApprovalsUseCase(
      new SignedDeviceRequest(
        devices,
        approvals,
        new NodeDeviceSignatureVerifier(),
        scopes,
        clock,
      ),
      approvals,
      mfa,
      alerts,
      users,
      lockout,
      keys,
      clock,
    );
    const enroll = async (email: string) => {
      const user = await users.register({
        email,
        password: 'x',
        displayName: email,
        locale: 'es-MX',
        homeTenantId: HOME,
      });
      const key = new DeviceKey();
      const deviceId = ids.next().toString();
      await devices.insert(
        Device.register({
          id: deviceId,
          userId: user.userId,
          name: 'Teléfono',
          platform: ClientPlatform.Ios,
          publicKey: key.publicKey,
          firstSeenAt: clock.now(),
          lastSeenAt: clock.now(),
          lastIp: ATTEMPT_IP,
          verifier: true,
        }),
      );
      return {
        email,
        key,
        deviceId,
        route: new DeviceRoute(user, deviceId).format(),
      };
    };
    const ana = await enroll('ana@example.com');
    const beto = await enroll('beto@example.com');
    await approvals.enqueue(
      ana.deviceId,
      {
        challengeId: CHALLENGE,
        code: '12345678',
        requestedAt: clock.now().toISOString(),
        expiresAt: new Date(clock.now().getTime() + 60_000).toISOString(),
        context: { ip: ATTEMPT_IP },
      },
      60_000,
    );
    const deny = (who: typeof ana, challengeId: string) =>
      useCase.deny({
        ...who.key.signed(DENY, who.route, [challengeId]),
        challengeId,
      });
    return { ana, beto, deny, mfa, alerts, lockout, keys };
  };

  it('ignores a challenge that the signing device did not have pending', async () => {
    const { beto, deny, mfa, alerts } = await build();

    await deny(beto, CHALLENGE);

    expect(mfa.denied).toEqual([]);
    expect(alerts.raised).toEqual([]);
  });

  it('cancels its own challenge, alerts and counts a failure for the origin of the attempt', async () => {
    const { ana, deny, mfa, alerts, lockout, keys } = await build();

    await deny(ana, CHALLENGE);
    await deny(ana, CHALLENGE);

    const account = keys.account(ana.email);
    expect(mfa.denied).toEqual([CHALLENGE]);
    expect(alerts.raised).toEqual([
      expect.objectContaining({ type: SecurityAlertType.DeviceApprovalDenied }),
    ]);
    // El fallo cuenta como uno de inicio de sesión: los que faltan para el bloqueo bajan en uno.
    for (let i = 0; i < 3; i += 1) {
      await lockout.recordFailure(account, ATTEMPT_IP);
    }
    await expect(
      lockout.recordFailure(account, ATTEMPT_IP),
    ).resolves.toMatchObject({ lockedForMs: expect.any(Number) });
  });
});
