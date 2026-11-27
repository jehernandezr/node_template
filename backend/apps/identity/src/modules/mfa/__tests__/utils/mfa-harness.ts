import {
  MfaFactor,
  UserStatus,
  type AuthMethodReference,
} from '@contracts/identity';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { InMemoryRateLimiter, StrictRateLimiter } from '@platform/rate-limit';
import { regionsConfigSchema, ServiceRegions } from '@platform/service';
import { ClientChannel } from '@platform/http';
import {
  InMemoryEphemeralStore,
  StaticAppConfig,
} from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { DeploymentRegion } from '../../../../sign-in/deployment-region.js';
import {
  InMemoryIdentityMailer,
  InMemorySecurityAlerts,
} from '../../../alerts/__tests__/utils/index.js';
import { InMemoryDevicesFacade } from '../../../devices/__tests__/utils/index.js';
import { InMemoryPasskeysFacade } from '../../../passkeys/__tests__/utils/index.js';
import { InMemorySessionsFacade } from '../../../sessions/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { ChallengeVerifier } from '../../application/challenge-verifier.js';
import { MfaMethodCatalog } from '../../application/mfa-method-catalog.js';
import { RequestMfaChallenge } from '../../application/request-mfa-challenge.use-case.js';
import { StartPendingMfa } from '../../application/start-pending-mfa.use-case.js';
import { StepUp } from '../../application/step-up.use-case.js';
import { VerifyMfa } from '../../application/verify-mfa.use-case.js';
import { EphemeralChallengeStore } from '../../infrastructure/ephemeral-challenge-store.js';
import { EphemeralPendingAuthenticationStore } from '../../infrastructure/ephemeral-pending-authentication-store.js';
import { InMemoryMfaFactors } from './in-memory-mfa-factors.js';
import { PlainSecretBox } from './plain-secret-box.js';

/**
 * The second factor use cases of one user over the real pending and challenge stores on an in-memory ephemeral
 * store, with the code of each email challenge read from the mailer double.
 */
export class MfaHarness {
  static readonly USER: UserRef = {
    userId: '01941f29-7c00-7000-8000-000000000021',
    homeTenantId: '01941f29-7c00-7000-8000-000000000022',
  };
  static readonly CLIENT = { ip: '203.0.113.10', channel: ClientChannel.Web };

  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly factors = new InMemoryMfaFactors();
  readonly devices = new InMemoryDevicesFacade();
  readonly sessions = new InMemorySessionsFacade();
  readonly mailer = new InMemoryIdentityMailer();
  readonly alerts = new InMemorySecurityAlerts();
  readonly users = new InMemoryUsersFacade().add({
    id: MfaHarness.USER.userId,
    homeTenantId: MfaHarness.USER.homeTenantId,
    email: 'ana@example.com',
    status: UserStatus.Active,
    displayName: 'Ana',
    locale: 'es',
  });
  private readonly ephemeral = new InMemoryEphemeralStore(this.clock);
  private readonly hasher = new HmacSecretHasher(
    ['test', 'mfa', 'pepper'].join('-'),
  );
  private readonly generator = new SecretGenerator(new SystemRandomSource());
  private readonly ids = new SequentialIdGenerator();
  private readonly scopes = UnroutedShardScopes.create();
  private readonly pendings = new EphemeralPendingAuthenticationStore(
    this.ephemeral,
    this.generator,
    this.hasher,
  );
  private readonly challenges = new EphemeralChallengeStore(
    this.ephemeral,
    this.clock,
  );
  private readonly catalog = new MfaMethodCatalog(
    this.devices,
    new InMemoryPasskeysFacade(),
    this.factors,
    this.scopes,
  );
  private readonly verifier = new ChallengeVerifier(
    this.challenges,
    this.factors,
    this.catalog,
    new PlainSecretBox(),
    this.hasher,
    this.alerts,
    new StrictRateLimiter(new InMemoryRateLimiter({ clock: this.clock })),
    this.scopes,
    new InMemoryTransactionManager(),
    this.clock,
  );
  readonly starter = new StartPendingMfa(
    this.pendings,
    this.catalog,
    this.ids,
    this.clock,
  );
  readonly challenge = new RequestMfaChallenge(
    this.pendings,
    this.challenges,
    this.devices,
    this.users,
    this.mailer,
    this.generator,
    this.hasher,
    this.ids,
    this.clock,
  );
  readonly verifyMfa: VerifyMfa;
  readonly stepUp: StepUp;

  constructor() {
    const settings = new IdentitySettings(
      new StaticAppConfig({ IDENTITY_REGION: 'us-east-1' }),
    );
    this.verifyMfa = new VerifyMfa(
      this.pendings,
      this.verifier,
      this.devices,
      this.sessions,
      this.factors,
      this.scopes,
      new DeploymentRegion(
        settings,
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
    this.stepUp = new StepUp(
      this.starter,
      this.pendings,
      this.verifier,
      this.sessions,
      this.clock,
    );
  }

  /** Opens a pending sign-in after the password, as `SignInWithPassword` does. */
  async pendingSignIn(
    authMethods: readonly AuthMethodReference[],
  ): Promise<string> {
    const pending = await this.starter.execute({
      user: MfaHarness.USER,
      purpose: PendingPurpose.SignIn,
      client: MfaHarness.CLIENT,
      authMethods,
    });
    return pending.mfaToken;
  }

  /** Asks for an email code of a pending authentication and returns the challenge and the code the user got. */
  async emailCode(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<{ challengeId: string; code: string }> {
    const { challengeId } = await this.challenge.execute(
      { mfaToken, method: MfaFactor.EmailOtp },
      purpose,
    );
    const code = this.mailer.last()?.variables['code'];
    if (typeof code !== 'string') {
      throw new Error('the email challenge sent no code');
    }
    return { challengeId, code };
  }
}
