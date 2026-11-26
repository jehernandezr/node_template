import {
  ClientPlatform,
  RevocationReason,
  UserStatus,
} from '@contracts/identity';
import { Secret } from '@platform/config';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { IdentitySettings } from '../../config/identity-settings.js';
import { StaticAppConfig } from '../../__tests__/utils/static-app-config.js';
import { InMemoryDevicesFacade } from '../../modules/devices/__tests__/utils/in-memory-devices.facade.js';
import { InMemoryMfaFacade } from '../../modules/mfa/__tests__/utils/in-memory-mfa.facade.js';
import { InMemoryPasswordsFacade } from '../../modules/passwords/__tests__/utils/in-memory-passwords.facade.js';
import { InMemorySessionsFacade } from '../../modules/sessions/__tests__/utils/in-memory-sessions.facade.js';
import { InMemoryUsersFacade } from '../../modules/users/__tests__/utils/in-memory-users.facade.js';
import { SmokeTenants } from '../smoke-tenants.js';
import { SeedSmokeAccount } from '../seed-smoke-account.js';

/** Smoke tenants in memory: what was placed and seeded, with its owner. */
class RecordingSmokeTenants extends SmokeTenants {
  readonly placed: string[] = [];
  readonly seeded: Array<{ tenantId: string; ownerUserId: string }> = [];

  override async place(tenantId: string): Promise<void> {
    this.placed.push(tenantId);
  }

  override async seed(tenantId: string, ownerUserId: string): Promise<void> {
    this.seeded.push({ tenantId, ownerUserId });
  }
}

describe('SeedSmokeAccount', () => {
  const EMAIL = 'success@simulator.amazonses.com';
  const account = (password: string, totpSecret = 'MZXW6YTBOJTG633CMFZA') =>
    new Secret(JSON.stringify({ email: EMAIL, password, totpSecret }));

  let users: InMemoryUsersFacade;
  let passwords: InMemoryPasswordsFacade;
  let mfa: InMemoryMfaFacade;
  let devices: InMemoryDevicesFacade;
  let sessions: InMemorySessionsFacade;
  let tenants: RecordingSmokeTenants;

  const seedWith = (configured: Secret | undefined) =>
    new SeedSmokeAccount(
      users,
      passwords,
      mfa,
      devices,
      sessions,
      tenants,
      new IdentitySettings(
        new StaticAppConfig({ IDENTITY_SMOKE_ACCOUNT: configured }),
      ),
      new SequentialIdGenerator(),
      new FixedClock(),
    ).execute();

  const smokeOwner = async () => {
    const owner = await users.findByEmail(EMAIL);
    if (owner === undefined) {
      throw new Error('The smoke owner was not created');
    }
    return {
      owner,
      ref: { userId: owner.id, homeTenantId: owner.homeTenantId },
    };
  };

  beforeEach(() => {
    users = new InMemoryUsersFacade(new SequentialIdGenerator());
    passwords = new InMemoryPasswordsFacade();
    mfa = new InMemoryMfaFacade();
    devices = new InMemoryDevicesFacade();
    sessions = new InMemorySessionsFacade();
    tenants = new RecordingSmokeTenants();
  });

  it('does nothing without IDENTITY_SMOKE_ACCOUNT', async () => {
    await expect(seedWith(undefined)).resolves.toBe(false);

    expect(users.registered).toEqual([]);
    expect(tenants.seeded).toEqual([]);
  });

  it('creates a verified owner in a new smoke tenant placed before it, with the password and TOTP', async () => {
    await expect(seedWith(account('a long smoke passphrase'))).resolves.toBe(
      true,
    );

    const { owner, ref } = await smokeOwner();

    expect(tenants.placed).toEqual([owner.homeTenantId]);
    expect(tenants.seeded).toEqual([
      { tenantId: owner.homeTenantId, ownerUserId: owner.id },
    ]);
    expect(users.registered[0]?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(owner.status).toBe(UserStatus.Active);
    await expect(
      passwords.verify(ref, 'a long smoke passphrase'),
    ).resolves.toBe(true);
    expect(Buffer.from(mfa.totpSecrets.get(owner.id) ?? []).toString()).toBe(
      'foobarfoobar',
    );
  });

  it('resets an existing owner to the new credential and drops its devices and sessions', async () => {
    await seedWith(account('the first smoke passphrase'));
    const { owner, ref } = await smokeOwner();
    await devices.register(ref, {
      publicKey: 'key',
      platform: ClientPlatform.Ios,
      ip: '192.0.2.1',
    });

    await seedWith(account('the second smoke passphrase', 'MFRGGZDFMZTWQ2LK'));

    expect(users.registered).toHaveLength(1);
    expect(tenants.placed).toHaveLength(1);
    expect(tenants.seeded).toEqual([
      { tenantId: owner.homeTenantId, ownerUserId: owner.id },
      { tenantId: owner.homeTenantId, ownerUserId: owner.id },
    ]);
    await expect(
      passwords.verify(ref, 'the first smoke passphrase'),
    ).resolves.toBe(false);
    await expect(
      passwords.verify(ref, 'the second smoke passphrase'),
    ).resolves.toBe(true);
    expect(Buffer.from(mfa.totpSecrets.get(owner.id) ?? []).toString()).toBe(
      'abcdefghij',
    );
    await expect(devices.verifiers(ref)).resolves.toEqual([]);
    expect(sessions.revokedForUser.at(-1)).toEqual({
      ref,
      reason: RevocationReason.AdminAction,
    });
  });

  it('rejects a password the policy refuses before touching the account', async () => {
    passwords.rejected.add('a refused smoke passphrase');

    await expect(
      seedWith(account('a refused smoke passphrase')),
    ).rejects.toThrow('Password rejected');
    expect(users.registered).toEqual([]);
  });
});
