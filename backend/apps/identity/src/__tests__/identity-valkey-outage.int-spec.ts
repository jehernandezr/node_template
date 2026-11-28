import { PlatformErrorCode } from '@contracts/platform';
import { IdentityRoute, MfaFactor } from '@contracts/identity';
import { PollUntil, ValkeyOutage } from '@platform/adapters-valkey/test-utils';
import { FlagEvaluator } from '@platform/flags';
import { ClientChannel } from '@platform/http';
import { Clock, HealthState, TransactionManager } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardScopes } from '@platform/persistence';
import { StrictRateLimiter } from '@platform/rate-limit';
import { SecurityAlerts } from '../modules/alerts/index.js';
import { AttemptCounters } from '../modules/authentication/domain/attempt-counters.js';
import { ChallengeVerifier } from '../modules/mfa/application/challenge-verifier.js';
import { MfaMethodCatalog } from '../modules/mfa/application/mfa-method-catalog.js';
import { MfaFactorRepository } from '../modules/mfa/domain/mfa-factor-repository.js';
import { SecretBox } from '../modules/mfa/domain/secret-box.js';
import { EphemeralChallengeStore } from '../modules/mfa/infrastructure/ephemeral-challenge-store.js';
import { BreachedPasswordList } from '../modules/passwords/domain/breached-password-list.js';
import { SecretHasher } from '../security/secret-hasher.js';
import { PendingPurpose } from '../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../shared/types/pending-authentication.type.js';
import {
  IdentityJourney,
  IdentityTestApp,
  InMemoryEphemeralStore,
  TestIds,
  type SessionTokensBody,
} from './utils/index.js';

interface ReadySummary {
  readonly checks: Readonly<Record<string, { readonly state: HealthState }>>;
}

const BREAKER_FAILURES = 5;

new ContainerRuntime(process.env).describeIfAvailable(
  'identity while Valkey is down',
  () => {
    jest.setTimeout(300_000);
    const app = new IdentityTestApp();
    const outage = new ValkeyOutage(() => app.valkeyAddress());
    const ana = new IdentityJourney(app, 'ana.outage@example.com');
    const leo = new IdentityJourney(app, 'leo.outage@example.com');
    let leoSession: SessionTokensBody;
    let mfaToken: string;
    let challengeId: string;

    const ready = async () => {
      const response = await app.client().get('/health/ready');
      return {
        status: response.status,
        summary: response.body as ReadySummary,
      };
    };

    beforeAll(async () => {
      await outage.start();
      await app.start(outage.environment());
      await ana.register();
      await leo.register();
      leoSession = await leo.signInWithEmailCode();
      mfaToken = ((await ana.signIn()).body as { mfa: { mfaToken: string } })
        .mfa.mfaToken;
      challengeId = (
        (
          await ana.native().post('/v1/auth/mfa/challenges', {
            body: { mfaToken, method: MfaFactor.EmailOtp },
          })
        ).body as { challengeId: string }
      ).challengeId;
      outage.begin();
      for (let attempt = 0; attempt < BREAKER_FAILURES; attempt += 1) {
        await ready();
      }
    });

    afterAll(async () => {
      outage.end();
      await app.stop();
      await outage.stop();
    });

    const dependencyUnavailable = {
      code: PlatformErrorCode.DependencyUnavailable,
    };

    const verifierWithLocalChallenges = async (
      pending: PendingAuthentication,
    ) => {
      const clock = app.get(Clock);
      const challenges = new EphemeralChallengeStore(
        new InMemoryEphemeralStore(clock),
        clock,
      );
      const challengeId = TestIds.next();
      await challenges.save({
        id: challengeId,
        pendingId: pending.id,
        method: MfaFactor.EmailOtp,
        codeHash: app.get(SecretHasher).digest('123456'),
        expiresAt: pending.expiresAt,
      });
      const verifier = new ChallengeVerifier(
        challenges,
        app.get(MfaFactorRepository),
        app.get(MfaMethodCatalog),
        app.get(SecretBox),
        app.get(SecretHasher),
        app.get(SecurityAlerts),
        app.get(StrictRateLimiter),
        app.get(ShardScopes),
        app.get(TransactionManager),
        clock,
      );
      return { verifier, challengeId };
    };

    const expectUnavailable = (response: {
      status: number;
      body: unknown;
    }): void => {
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    };

    it('stays ready and reports Valkey as degraded', async () => {
      const { status, summary } = await ready();

      expect(status).toBe(200);
      expect(summary.checks['valkey']).toMatchObject({
        state: HealthState.Degraded,
      });
    });

    it('answers 503 to a password sign-in', async () => {
      expectUnavailable(await ana.signIn(ana.native(), 'not the password'));
    });

    it('answers 503 to a second-factor code whose challenge cannot be read', async () => {
      expectUnavailable(
        await ana.native().post('/v1/auth/mfa/verify', {
          body: { mfaToken, challengeId, code: '000000' },
        }),
      );
    });

    it('fails the lockout counters instead of counting the failure in one process', async () => {
      const counters = app.get(AttemptCounters);
      const origin = TestIds.next();
      const account = TestIds.next();

      await expect(
        counters.recordFailure(origin, account, IdentityTestApp.DEFAULT_IP),
      ).rejects.toMatchObject(dependencyUnavailable);
      await expect(
        counters.recordFailure(origin, account, IdentityTestApp.DEFAULT_IP),
      ).rejects.toMatchObject(dependencyUnavailable);
    });

    it('fails the per-user second-factor cap even when the challenge can be read', async () => {
      const clock = app.get(Clock);
      const pending: PendingAuthentication = {
        id: TestIds.next(),
        user: { userId: TestIds.next(), homeTenantId: TestIds.next() },
        purpose: PendingPurpose.SignIn,
        offeredFactors: [MfaFactor.EmailOtp],
        client: { ip: IdentityTestApp.DEFAULT_IP, channel: ClientChannel.Web },
        authMethods: [],
        expiresAt: new Date(clock.now().getTime() + 60_000),
      };
      const { verifier, challengeId } =
        await verifierWithLocalChallenges(pending);

      await expect(
        verifier.verify(pending, challengeId, '000000'),
      ).rejects.toMatchObject(dependencyUnavailable);
    });

    it('refuses a signed device request whose nonce cannot be recorded', async () => {
      const deviceId = IdentityJourney.deviceIdFrom(leoSession.accessToken);

      expectUnavailable(
        await leo.native().post('/v1/auth/device-approvals/pull', {
          body: leo.device.signed(IdentityRoute.PullDeviceApprovals, deviceId),
        }),
      );
    });

    it('refuses an access token whose revocation cannot be checked', async () => {
      expectUnavailable(await leo.bearer(leoSession.accessToken).get('/v1/me'));
    });

    it('still finds a breached password from the source list', async () => {
      await expect(
        app.get(BreachedPasswordList).contains('Password1234'),
      ).resolves.toBe(true);
    });

    it('evaluates feature flags from their own store', async () => {
      await expect(
        app.get(FlagEvaluator).enabledFlags({
          tenantId: TestIds.next(),
          userId: TestIds.next(),
        }),
      ).resolves.toEqual(expect.any(Array));
    });

    it('signs in again once Valkey is back', async () => {
      outage.end();
      await PollUntil.run(
        async () =>
          (await ready()).summary.checks['valkey']?.state === HealthState.Up,
        30_000,
      );

      const signIn = await ana.signIn();

      expect(signIn.status).toBe(200);
    });
  },
);
