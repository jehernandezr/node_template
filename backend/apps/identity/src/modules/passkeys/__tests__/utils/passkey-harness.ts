import {
  AuthMethodReference,
  ClientPlatform,
  IdentityRoute,
  MfaFactor,
  UserStatus,
} from '@contracts/identity';
import { ClientChannel } from '@platform/http';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { regionsConfigSchema, ServiceRegions } from '@platform/service';
import {
  DeviceKey,
  InMemoryEphemeralStore,
  type SoftwareAuthenticator,
  StaticAppConfig,
} from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import type { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import { DeploymentRegion } from '../../../../sign-in/deployment-region.js';
import { InMemoryDevicesFacade } from '../../../devices/__tests__/utils/index.js';
import { InMemoryMfaFacade } from '../../../mfa/__tests__/utils/index.js';
import { InMemorySessionsFacade } from '../../../sessions/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { PasskeyAuthentication } from '../../application/passkey-authentication.use-case.js';
import { PasskeyCeremony } from '../../application/passkey-ceremony.js';
import { EphemeralWebAuthnChallengeStore } from '../../infrastructure/ephemeral-webauthn-challenge-store.js';
import { SimpleWebAuthnVerifier } from '../../infrastructure/simple-webauthn-verifier.js';
import {
  InMemoryPasskeyDirectory,
  InMemoryPasskeyRepository,
} from './in-memory-passkey-store.js';

export const ANA = {
  userId: '01941f29-7c00-7000-8000-000000000021',
  homeTenantId: '01941f29-7c00-7000-8000-000000000022',
};
export const ORIGIN = 'https://app.example.test';
export const CLIENT = { ip: '203.0.113.10', channel: ClientChannel.Web };
export const DEVICE = '01941f29-7c00-7000-8000-000000000031';

/** Passkey sign-in, second factor and step-up over the real WebAuthn verifier and a software authenticator. */
export class PasskeyHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly users = new InMemoryUsersFacade();
  readonly devices = new InMemoryDevicesFacade();
  readonly mfa = new InMemoryMfaFacade();
  readonly sessions = new InMemorySessionsFacade();
  readonly passkeys = new InMemoryPasskeyRepository();
  readonly directory = new InMemoryPasskeyDirectory();
  readonly deviceKey = new DeviceKey();
  private readonly ids = new SequentialIdGenerator();
  private readonly settings = new IdentitySettings(
    new StaticAppConfig({
      IDENTITY_REGION: 'us-east-1',
      WEBAUTHN_RP_ID: 'app.example.test',
      WEBAUTHN_RP_NAME: 'Example',
      WEBAUTHN_ORIGINS: [ORIGIN],
    }),
  );
  readonly webauthn = new SimpleWebAuthnVerifier(this.settings);
  readonly ceremony = new PasskeyCeremony(
    new EphemeralWebAuthnChallengeStore(new InMemoryEphemeralStore(this.clock)),
    this.passkeys,
    this.webauthn,
    new SecretGenerator(new SystemRandomSource()),
    UnroutedShardScopes.create(),
    new InMemoryTransactionManager(),
    this.ids,
    this.clock,
  );
  readonly authentication = new PasskeyAuthentication(
    this.ceremony,
    this.directory,
    this.webauthn,
    this.users,
    this.devices,
    this.mfa,
    this.sessions,
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
    this.clock,
  );

  constructor(status = UserStatus.Active) {
    this.users.add({
      id: ANA.userId,
      homeTenantId: ANA.homeTenantId,
      email: 'ana@example.com',
      status,
      displayName: 'Ana',
      locale: 'es',
    });
    this.devices.add({
      id: DEVICE,
      userId: ANA.userId,
      name: 'Laptop',
      platform: ClientPlatform.Web,
      publicKey: this.deviceKey.publicKey,
      verifier: true,
    });
  }

  async register(authenticator: SoftwareAuthenticator): Promise<void> {
    const challenge = Buffer.from('registration challenge').toString(
      'base64url',
    );
    const options = await this.webauthn.registrationOptions({
      challenge,
      userId: ANA.userId,
      userName: 'ana@example.com',
      exclude: [],
    });
    const response = authenticator.create(
      Buffer.from(JSON.stringify(options)).toString('base64url'),
    );
    const registered = await this.webauthn.verifyRegistration(
      this.ceremony.credential(response),
      challenge,
    );
    if (registered === undefined) {
      throw new Error('the software authenticator did not register');
    }
    await this.passkeys.insert({
      id: this.ids.next().toString(),
      userId: ANA.userId,
      name: 'Laptop',
      createdAt: this.clock.now(),
      ...registered,
    });
    await this.directory.register(registered.credentialId, ANA);
  }

  async signIn(authenticator: SoftwareAuthenticator, signedDevice = true) {
    const { challengeId, optionsJson } =
      await this.authentication.signInOptions();
    return this.authentication.signIn(
      {
        challengeId,
        credentialJson: authenticator.get(optionsJson),
        ...(signedDevice
          ? {
              device: this.deviceKey.signed(
                IdentityRoute.PasskeySignInVerify,
                await this.devices.issueDeviceId(ANA, DEVICE),
                [challengeId],
              ),
            }
          : {}),
      },
      CLIENT,
    );
  }

  pending(purpose: PendingPurpose, sessionId?: string): string {
    const mfaToken = `token-${purpose}`;
    this.mfa.pendings.set(mfaToken, {
      id: `pending-${purpose}`,
      user: ANA,
      purpose,
      offeredFactors: [MfaFactor.EmailOtp, MfaFactor.Passkey],
      ...(sessionId === undefined ? {} : { sessionId }),
      client: CLIENT,
      authMethods: [AuthMethodReference.Password],
      expiresAt: new Date(this.clock.now().getTime() + 60_000),
    });
    return mfaToken;
  }
}
