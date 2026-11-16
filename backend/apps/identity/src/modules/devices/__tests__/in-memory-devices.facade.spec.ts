import { ClientPlatform, type DeviceApproval } from '@contracts/identity';
import { InMemoryDevicesFacade } from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 't',
};
const OTHER = {
  userId: '018f0000-0000-7000-8000-000000000002',
  homeTenantId: 't',
};
const APPROVAL: DeviceApproval = {
  challengeId: 'c-1',
  code: '123456',
  requestedAt: '2026-11-16T10:00:00.000Z',
  expiresAt: '2026-11-16T10:05:00.000Z',
  context: { browser: 'Safari', os: 'iOS', city: 'CDMX' },
};

describe('InMemoryDevicesFacade', () => {
  it('issues a device id derived from the user', async () => {
    await expect(new InMemoryDevicesFacade().issueDeviceId(ANA)).resolves.toBe(
      `dv1_${ANA.userId}`,
    );
  });

  it('recognizes the device id of a user with a device', async () => {
    const facade = new InMemoryDevicesFacade();
    const device = await facade.register(ANA, {
      publicKey: 'clave',
      platform: ClientPlatform.Ios,
      ip: '203.0.113.5',
    });

    await expect(facade.recognize(ANA, `dv1_${ANA.userId}`)).resolves.toEqual({
      recognized: true,
      device,
    });
  });

  it('does not recognize a wrong token or a user without devices', async () => {
    const facade = new InMemoryDevicesFacade();
    await facade.register(ANA, {
      publicKey: 'clave',
      platform: ClientPlatform.Web,
      ip: '203.0.113.5',
    });

    await expect(facade.recognize(ANA, 'dv1_otro')).resolves.toEqual({
      recognized: false,
    });
    await expect(
      facade.recognize(OTHER, `dv1_${OTHER.userId}`),
    ).resolves.toEqual({ recognized: false });
    await expect(facade.recognize(ANA)).resolves.toEqual({ recognized: false });
  });

  it('registers the first device as verifier and names it after the platform by default', async () => {
    const facade = new InMemoryDevicesFacade();

    const first = await facade.register(ANA, {
      publicKey: 'clave-1',
      platform: ClientPlatform.Android,
      ip: '203.0.113.5',
    });
    const second = await facade.register(ANA, {
      publicKey: 'clave-2',
      platform: ClientPlatform.Macos,
      name: 'MacBook de Ana',
      ip: '203.0.113.5',
    });

    expect(first).toMatchObject({
      name: 'android',
      verifier: true,
      publicKey: 'clave-1',
    });
    expect(second).toMatchObject({ name: 'MacBook de Ana', verifier: false });
  });

  it('lists only the verifiers of the user', async () => {
    const facade = new InMemoryDevicesFacade();
    const verifier = await facade.register(ANA, {
      publicKey: 'a',
      platform: ClientPlatform.Ios,
      ip: '203.0.113.5',
    });
    await facade.register(ANA, {
      publicKey: 'b',
      platform: ClientPlatform.Ios,
      ip: '203.0.113.5',
    });
    await facade.register(OTHER, {
      publicKey: 'c',
      platform: ClientPlatform.Web,
      ip: '203.0.113.6',
    });

    await expect(facade.verifiers(ANA)).resolves.toEqual([verifier]);
  });

  it('keeps the approvals of a device in arrival order', async () => {
    const facade = new InMemoryDevicesFacade();

    expect(facade.approvalsFor('dv-1')).toEqual([]);
    await facade.enqueueApproval('dv-1', APPROVAL);
    await facade.enqueueApproval('dv-1', { ...APPROVAL, challengeId: 'c-2' });

    expect(facade.approvalsFor('dv-1').map((a) => a.challengeId)).toEqual([
      'c-1',
      'c-2',
    ]);
  });

  it('adds a seeded device that verifiers can list', async () => {
    const facade = new InMemoryDevicesFacade().add({
      id: 'dev-1',
      userId: ANA.userId,
      name: 'iPhone',
      platform: ClientPlatform.Ios,
      publicKey: 'clave',
      verifier: true,
    });

    await expect(facade.verifiers(ANA)).resolves.toHaveLength(1);
  });
});
