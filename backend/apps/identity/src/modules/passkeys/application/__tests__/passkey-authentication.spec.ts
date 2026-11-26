import {
  AuthMethodReference,
  IdentityErrorCode,
  SignInStatus,
  UserStatus,
} from '@contracts/identity';
import { SoftwareAuthenticator } from '../../../../__tests__/utils/index.js';
import { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import {
  ANA,
  CLIENT,
  DEVICE,
  ORIGIN,
  PasskeyHarness,
} from '../../__tests__/utils/index.js';

const SESSION = '01941f29-7c00-7000-8000-000000000041';

describe('PasskeyAuthentication', () => {
  describe('when signing in without a password', () => {
    it('opens a session with both factors from a trusted device and a passkey that verifies the user', async () => {
      const harness = new PasskeyHarness();
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);

      const response = await harness.signIn(authenticator);

      expect(response.status).toBe(SignInStatus.Authenticated);
      expect(harness.sessions.created).toEqual([
        expect.objectContaining({
          user: ANA,
          deviceId: DEVICE,
          authMethods: [
            AuthMethodReference.Passkey,
            AuthMethodReference.Device,
          ],
        }),
      ]);
    });

    it('asks for a second factor from a device it does not recognize', async () => {
      const harness = new PasskeyHarness();
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);

      const response = await harness.signIn(authenticator, false);

      expect(response.status).toBe(SignInStatus.MfaRequired);
      expect(harness.sessions.created).toEqual([]);
    });

    it('asks for a second factor when the passkey only proves presence', async () => {
      const harness = new PasskeyHarness();
      const securityKey = new SoftwareAuthenticator(ORIGIN, false);
      await harness.register(securityKey);

      const response = await harness.signIn(securityKey);

      expect(response.status).toBe(SignInStatus.MfaRequired);
      expect(harness.mfa.started).toEqual([
        expect.objectContaining({ authMethods: [AuthMethodReference.Passkey] }),
      ]);
    });

    it('accepts one sign-in when the same response is sent twice at the same time', async () => {
      const harness = new PasskeyHarness();
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);
      const { challengeId, optionsJson } =
        await harness.authentication.signInOptions();
      const request = {
        challengeId,
        credentialJson: authenticator.get(optionsJson),
      };

      const outcomes = await Promise.allSettled([
        harness.authentication.signIn(request, CLIENT),
        harness.authentication.signIn(request, CLIENT),
      ]);

      expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
        'fulfilled',
        'rejected',
      ]);
    });

    it('refuses a passkey nobody registered', async () => {
      const harness = new PasskeyHarness();

      await expect(
        harness.signIn(new SoftwareAuthenticator(ORIGIN)),
      ).rejects.toMatchObject({
        code: IdentityErrorCode.PasskeyVerificationFailed,
      });
    });

    it('refuses a suspended user even with a valid passkey', async () => {
      const harness = new PasskeyHarness(UserStatus.Suspended);
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);

      await expect(harness.signIn(authenticator)).rejects.toMatchObject({
        code: IdentityErrorCode.UserSuspended,
      });
    });
  });

  describe('when it is the second factor or a step-up', () => {
    it('completes a pending sign-in with a passkey that verifies the user', async () => {
      const harness = new PasskeyHarness();
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);
      const mfaToken = harness.pending(PendingPurpose.SignIn);
      const { challengeId, optionsJson } =
        await harness.authentication.mfaOptions(mfaToken);

      await harness.authentication.mfaVerify({
        mfaToken,
        challengeId,
        credentialJson: authenticator.get(optionsJson),
      });

      expect(harness.mfa.completed).toEqual([
        { mfaToken, methods: [AuthMethodReference.Passkey] },
      ]);
    });

    it('refuses as a second factor a passkey that only proves presence', async () => {
      const harness = new PasskeyHarness();
      const securityKey = new SoftwareAuthenticator(ORIGIN, false);
      await harness.register(securityKey);
      const mfaToken = harness.pending(PendingPurpose.SignIn);
      const { challengeId, optionsJson } =
        await harness.authentication.mfaOptions(mfaToken);

      await expect(
        harness.authentication.mfaVerify({
          mfaToken,
          challengeId,
          credentialJson: securityKey.get(optionsJson),
        }),
      ).rejects.toMatchObject({
        code: IdentityErrorCode.PasskeyVerificationFailed,
      });
      expect(harness.mfa.completed).toEqual([]);
    });

    it('raises the session that asked for the step-up and refuses it to any other session', async () => {
      const harness = new PasskeyHarness();
      const authenticator = new SoftwareAuthenticator(ORIGIN);
      await harness.register(authenticator);
      const mfaToken = harness.pending(PendingPurpose.StepUp, SESSION);

      await expect(
        harness.authentication.stepUpOptions(mfaToken, 'another-session'),
      ).rejects.toMatchObject({ code: IdentityErrorCode.MfaTokenInvalid });
      const { challengeId, optionsJson } =
        await harness.authentication.stepUpOptions(mfaToken, SESSION);
      await harness.authentication.stepUpVerify(
        {
          mfaToken,
          challengeId,
          credentialJson: authenticator.get(optionsJson),
        },
        SESSION,
      );

      expect(harness.mfa.completed).toEqual([
        { mfaToken, methods: [AuthMethodReference.Passkey] },
      ]);
    });
  });
});
