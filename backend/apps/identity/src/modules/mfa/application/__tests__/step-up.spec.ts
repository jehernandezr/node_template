import {
  AuthMethodReference,
  IdentityErrorCode,
  MfaFactor,
} from '@contracts/identity';
import type { UserActor } from '@platform/auth';
import { TestActors } from '@platform/auth/test-utils';
import { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import { MfaHarness } from '../../__tests__/utils/index.js';

const USER = MfaHarness.USER;

const actorOf = (sessionId: string): UserActor => ({
  ...TestActors.user(USER.homeTenantId),
  userId: USER.userId,
  homeTenantId: USER.homeTenantId,
  sessionId,
  authMethods: [AuthMethodReference.Password],
});

const SESSION = '01941f29-7c00-7000-8000-000000000041';
const OTHER_SESSION = '01941f29-7c00-7000-8000-000000000042';

describe('StepUp', () => {
  it('offers the second factors the session has not used yet', async () => {
    const harness = new MfaHarness();

    const pending = await harness.stepUp.begin(
      actorOf(SESSION),
      MfaHarness.CLIENT,
    );

    expect(pending.methods).toEqual([MfaFactor.EmailOtp]);
  });

  it('raises the last second factor of the session and returns its new access token', async () => {
    const harness = new MfaHarness();
    const actor = actorOf(SESSION);
    const { mfaToken } = await harness.stepUp.begin(actor, MfaHarness.CLIENT);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.StepUp,
    );

    const result = await harness.stepUp.verify(actor, {
      mfaToken,
      challengeId,
      code,
    });

    expect(result.mfaVerifiedAt).toBe(harness.clock.now().toISOString());
    expect(harness.sessions.verified).toEqual([
      {
        session: { sessionId: SESSION, ...USER },
        at: harness.clock.now(),
        amr: [AuthMethodReference.EmailOtp],
      },
    ]);
  });

  it('refuses a step-up token presented by another session of the same user', async () => {
    const harness = new MfaHarness();
    const { mfaToken } = await harness.stepUp.begin(
      actorOf(SESSION),
      MfaHarness.CLIENT,
    );
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.StepUp,
    );

    await expect(
      harness.stepUp.verify(actorOf(OTHER_SESSION), {
        mfaToken,
        challengeId,
        code,
      }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.MfaTokenInvalid });
    expect(harness.sessions.verified).toEqual([]);
  });

  it('refuses a sign-in token, which cannot raise a session', async () => {
    const harness = new MfaHarness();
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    await expect(
      harness.stepUp.verify(actorOf(SESSION), { mfaToken, challengeId, code }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.MfaTokenInvalid });
  });

  it('raises the session once when the same code is sent twice at the same time', async () => {
    const harness = new MfaHarness();
    const actor = actorOf(SESSION);
    const { mfaToken } = await harness.stepUp.begin(actor, MfaHarness.CLIENT);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.StepUp,
    );

    await Promise.allSettled([
      harness.stepUp.verify(actor, { mfaToken, challengeId, code }),
      harness.stepUp.verify(actor, { mfaToken, challengeId, code }),
    ]);

    expect(harness.sessions.verified).toHaveLength(1);
  });
});
