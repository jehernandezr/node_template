import {
  AuthMethodReference,
  ClientPlatform,
  IdentityErrorCode,
  IdentityRoute,
  SecurityAlertType,
  SignInStatus,
  UserStatus,
} from '@contracts/identity';
import { ClientChannel } from '@platform/http';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { regionsConfigSchema, ServiceRegions } from '@platform/service';
import {
  DeviceKey,
  InMemoryEphemeralStore,
  StaticAppConfig,
} from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { LockoutRules } from '../../../../shared/constants/lockout.constants.js';
import { DeploymentRegion } from '../../../../sign-in/deployment-region.js';
import { InMemoryAccessFacade } from '../../../access/__tests__/utils/index.js';
import { InMemorySecurityAlerts } from '../../../alerts/__tests__/utils/index.js';
import { InMemoryDevicesFacade } from '../../../devices/__tests__/utils/index.js';
import { InMemoryMfaFacade } from '../../../mfa/__tests__/utils/index.js';
import { InMemoryPasswordsFacade } from '../../../passwords/__tests__/utils/index.js';
import { InMemorySessionsFacade } from '../../../sessions/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import {
  InMemoryLoginAttempts,
  TestLoginLockout,
} from '../../__tests__/utils/index.js';
import {
  LoginAttemptReason,
  LoginAttemptResult,
} from '../../domain/login-attempt.js';
import { SignInWithPassword } from '../sign-in-with-password.use-case.js';

const ANA = {
  userId: '01941f29-7c00-7000-8000-000000000021',
  homeTenantId: '01941f29-7c00-7000-8000-000000000022',
};
const DEFAULT_TENANT = '01941f29-7c00-7000-8000-000000000099';
const EMAIL = 'ana@example.com';
const PASSWORD = 'correct horse battery staple 42';
const CLIENT = { ip: '203.0.113.10', channel: ClientChannel.Web };
const DEVICE = '01941f29-7c00-7000-8000-000000000031';

class SignInHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly users = new InMemoryUsersFacade();
  readonly passwords = new InMemoryPasswordsFacade();
  readonly devices = new InMemoryDevicesFacade();
  readonly access = new InMemoryAccessFacade().setDefaultTenant(
    ANA.userId,
    ANA.homeTenantId,
  );
  readonly mfa = new InMemoryMfaFacade();
  readonly sessions = new InMemorySessionsFacade();
  readonly alerts = new InMemorySecurityAlerts();
  readonly attempts = new InMemoryLoginAttempts();
  readonly deviceKey = new DeviceKey();
  private readonly lockout = new TestLoginLockout(
    new InMemoryEphemeralStore(this.clock),
    this.clock,
  );
  private readonly settings = new IdentitySettings(
    new StaticAppConfig({
      IDENTITY_DEFAULT_TENANT_ID: DEFAULT_TENANT,
      IDENTITY_REGION: 'us-east-1',
    }),
  );
  readonly signIn = new SignInWithPassword(
    this.users,
    this.passwords,
    this.devices,
    this.access,
    this.mfa,
    this.sessions,
    this.alerts,
    this.lockout.lockout,
    this.attempts,
    this.lockout.keys,
    UnroutedShardScopes.create(),
    new RequestContextStore(new Tracing(new Redactor())),
    new SequentialIdGenerator(),
    this.clock,
    new DeploymentRegion(
      this.settings,
      new ServiceRegions(
        regionsConfigSchema.parse({
          REGIONS: JSON.stringify([
            {
              code: 'us-east-1',
              apiBaseUrl: 'https://us-east-1.api.test',
              issuer: 'https://us-east-1.id.test',
            },
          ]),
          SERVICE_REGION: 'us-east-1',
        }),
      ),
    ),
    this.settings,
  );

  async withAna(status = UserStatus.Active): Promise<this> {
    this.users.add({
      id: ANA.userId,
      homeTenantId: ANA.homeTenantId,
      email: EMAIL,
      status,
      displayName: 'Ana',
      locale: 'es',
    });
    await this.passwords.setInitial(ANA, PASSWORD);
    return this;
  }

  async withKnownDevice(): Promise<this> {
    this.devices.add({
      id: DEVICE,
      userId: ANA.userId,
      name: 'Laptop',
      platform: ClientPlatform.Web,
      publicKey: this.deviceKey.publicKey,
      verifier: true,
    });
    return this;
  }

  async signedDevice() {
    const deviceId = await this.devices.issueDeviceId(ANA, DEVICE);
    return this.deviceKey.signed(IdentityRoute.SignIn, deviceId, [EMAIL]);
  }

  attempt(password: string, email = EMAIL) {
    return this.signIn.execute({
      request: { email, password },
      client: CLIENT,
    });
  }
}

describe('SignInWithPassword', () => {
  it('opens a session at once from a device the user already trusts', async () => {
    const harness = await (
      await new SignInHarness().withAna()
    ).withKnownDevice();

    const response = await harness.signIn.execute({
      request: {
        email: EMAIL,
        password: PASSWORD,
        device: await harness.signedDevice(),
      },
      client: CLIENT,
    });

    expect(response.status).toBe(SignInStatus.Authenticated);
    expect(response.region).toBe('us-east-1');
    expect(harness.sessions.created).toEqual([
      expect.objectContaining({
        user: ANA,
        deviceId: DEVICE,
        authMethods: [AuthMethodReference.Password],
      }),
    ]);
    expect(harness.attempts.recorded).toEqual([
      expect.objectContaining({
        userId: ANA.userId,
        result: LoginAttemptResult.Succeeded,
      }),
    ]);
  });

  it('asks for a second factor from a device it does not recognize, without opening a session', async () => {
    const harness = await new SignInHarness().withAna();

    const response = await harness.attempt(PASSWORD);

    expect(response.status).toBe(SignInStatus.MfaRequired);
    expect(harness.sessions.created).toEqual([]);
    expect(harness.mfa.started).toEqual([
      expect.objectContaining({ user: ANA }),
    ]);
  });

  it('asks a privileged member for a second factor even from a trusted device', async () => {
    const harness = await (
      await new SignInHarness().withAna()
    ).withKnownDevice();
    harness.access.requireMfaOnEveryLogin(ANA.userId, ANA.homeTenantId);

    const response = await harness.signIn.execute({
      request: {
        email: EMAIL,
        password: PASSWORD,
        device: await harness.signedDevice(),
      },
      client: CLIENT,
    });

    expect(response.status).toBe(SignInStatus.MfaRequired);
  });

  it('refuses a wrong password and records the failed attempt of the user', async () => {
    const harness = await new SignInHarness().withAna();

    await expect(harness.attempt('wrong password')).rejects.toMatchObject({
      code: IdentityErrorCode.AuthInvalidCredentials,
    });
    expect(harness.attempts.recorded).toEqual([
      expect.objectContaining({
        userId: ANA.userId,
        result: LoginAttemptResult.Failed,
        reason: LoginAttemptReason.InvalidPassword,
      }),
    ]);
  });

  it('answers an unknown email as a wrong password, after checking a password all the same', async () => {
    const harness = new SignInHarness();

    await expect(
      harness.attempt(PASSWORD, 'nobody@example.com'),
    ).rejects.toMatchObject({ code: IdentityErrorCode.AuthInvalidCredentials });
    expect(harness.passwords.unknownUserChecks).toBe(1);
    expect(harness.attempts.recorded).toEqual([
      expect.objectContaining({
        userId: null,
        reason: LoginAttemptReason.UnknownAccount,
      }),
    ]);
  });

  it('locks the origin when wrong passwords arrive at the same time, alerts the user and refuses even the right one', async () => {
    const harness = await new SignInHarness().withAna();

    const outcomes = await Promise.allSettled(
      Array.from({ length: LockoutRules.origin.maxFailures }, () =>
        harness.attempt('wrong password'),
      ),
    );

    expect(outcomes.every((outcome) => outcome.status === 'rejected')).toBe(
      true,
    );
    expect(harness.alerts.raised).toContainEqual(
      expect.objectContaining({ type: SecurityAlertType.AccountLocked }),
    );
    await expect(harness.attempt(PASSWORD)).rejects.toMatchObject({
      code: IdentityErrorCode.AuthInvalidCredentials,
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(harness.sessions.created).toEqual([]);
  });

  it.each([
    [UserStatus.Suspended, IdentityErrorCode.UserSuspended],
    [UserStatus.PendingVerification, IdentityErrorCode.AuthEmailNotVerified],
  ])('refuses a %s account with the right password', async (status, code) => {
    const harness = await new SignInHarness().withAna(status);

    await expect(harness.attempt(PASSWORD)).rejects.toMatchObject({ code });
    expect(harness.sessions.created).toEqual([]);
  });
});
