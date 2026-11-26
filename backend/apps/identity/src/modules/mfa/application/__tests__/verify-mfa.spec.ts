import {
  AuthMethodReference,
  IdentityErrorCode,
  SignInStatus,
} from '@contracts/identity';
import { DeviceKey } from '../../../../__tests__/utils/index.js';
import { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import { MfaHarness } from '../../__tests__/utils/index.js';
import { MfaRecoveryStatus } from '../../domain/mfa-recovery.js';

const USER = MfaHarness.USER;

describe('VerifyMfa', () => {
  it('opens the session with the password and the email code once the code is right', async () => {
    const harness = new MfaHarness();
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    const response = await harness.verifyMfa.execute({
      mfaToken,
      challengeId,
      code,
    });

    expect(response.status).toBe(SignInStatus.Authenticated);
    expect(harness.sessions.created).toEqual([
      expect.objectContaining({
        user: USER,
        authMethods: [
          AuthMethodReference.Password,
          AuthMethodReference.EmailOtp,
        ],
        mfaVerifiedAt: harness.clock.now(),
      }),
    ]);
  });

  it('opens one session when the same code is sent twice at the same time', async () => {
    const harness = new MfaHarness();
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    const outcomes = await Promise.allSettled([
      harness.verifyMfa.execute({ mfaToken, challengeId, code }),
      harness.verifyMfa.execute({ mfaToken, challengeId, code }),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(harness.sessions.created).toHaveLength(1);
  });

  it('refuses a wrong code and keeps the sign-in pending for the right one', async () => {
    const harness = new MfaHarness();
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    await expect(
      harness.verifyMfa.execute({ mfaToken, challengeId, code: '000000x' }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.MfaCodeInvalid });
    await expect(
      harness.verifyMfa.execute({ mfaToken, challengeId, code }),
    ).resolves.toMatchObject({ status: SignInStatus.Authenticated });
  });

  it('registers the new device and binds the session to it', async () => {
    const harness = new MfaHarness();
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    await harness.verifyMfa.execute({
      mfaToken,
      challengeId,
      code,
      devicePublicKey: new DeviceKey().publicKey,
    });

    const [device] = await harness.devices.verifiers(USER);
    expect(device).toBeDefined();
    expect(harness.sessions.created[0]?.deviceId).toBe(device?.id);
  });

  it('cancels a pending recovery without a device once the user proves a second factor', async () => {
    const harness = new MfaHarness();
    await harness.factors.insertRecovery({
      id: '01941f29-7c00-7000-8000-000000000051',
      userId: USER.userId,
      tokenHash: 'pending-recovery',
      requestedAt: harness.clock.now(),
      availableAt: harness.clock.now(),
      status: MfaRecoveryStatus.Pending,
    });
    const mfaToken = await harness.pendingSignIn([
      AuthMethodReference.Password,
    ]);
    const { challengeId, code } = await harness.emailCode(
      mfaToken,
      PendingPurpose.SignIn,
    );

    await harness.verifyMfa.execute({ mfaToken, challengeId, code });

    expect(harness.factors.recoveriesOf(USER.userId)).toEqual([
      expect.objectContaining({ status: MfaRecoveryStatus.Cancelled }),
    ]);
  });

  it('refuses an unknown pending token', async () => {
    const harness = new MfaHarness();

    await expect(
      harness.verifyMfa.execute({
        mfaToken: 'unknown',
        challengeId: 'unknown',
        code: '123456',
      }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.MfaTokenInvalid });
  });
});
