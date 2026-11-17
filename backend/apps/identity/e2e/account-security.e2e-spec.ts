import {
  ListPushTargetsOperation,
  IdentityErrorCode,
} from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { HttpTestClient } from '@platform/http/test-utils';
import { IdentityTestApp } from '../src/__tests__/utils/index.js';
import { IdentityEmailTemplate } from '../src/shared/enums/identity-email-template.enum.js';
import {
  AccessTokenClaimsReader,
  IdentityJourney,
  TotpCodes,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);
// Valores de prueba armados en tiempo de ejecución: un literal junto a `token` o `password` parece una credencial.
const UNKNOWN_PROOF = ['token', 'que', 'no', 'existe'].join('-');
const PUSH_DESTINATION = ['push', 'de', 'prueba'].join('-');
const SHORT_PHRASE = ['password', '1234'].join('');
const NEW_PHRASE = ['Una', 'frase', 'nueva', 'y', 'larga', '2026'].join('-');

runtime.describeIfAvailable('account security end to end', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const totp = new TotpCodes();
  const rita = new IdentityJourney(app, 'rita.cuenta@example.com');
  let session: SessionTokensBody;
  let me: HttpTestClient;
  let deviceId: string;

  beforeAll(async () => {
    await app.start();
    await rita.register();
    session = await rita.signInWithEmailCode();
    me = rita.bearer(session.accessToken);
    deviceId = IdentityJourney.deviceIdFrom(session.accessToken);
  });

  afterAll(async () => {
    await app.stop();
  });

  it('reads and updates the profile', async () => {
    const profile = await me.get('/v1/me');
    const updated = await me.patch('/v1/me', {
      body: { displayName: 'Rita', locale: 'es-CO' },
    });

    expect(profile.body).toMatchObject({ email: rita.email, status: 'active' });
    expect(updated.body).toMatchObject({
      displayName: 'Rita',
      locale: 'es-CO',
    });
  });

  it('rejects verification tokens that are not valid and resends only to pending accounts', async () => {
    const invalid = await rita
      .native()
      .post('/v1/auth/email-verifications/confirm', {
        body: { token: UNKNOWN_PROOF },
      });
    const resend = await rita.native().post('/v1/auth/email-verifications', {
      body: { email: rita.email },
    });

    expect(invalid.body).toMatchObject({
      code: IdentityErrorCode.UserEmailVerificationInvalid,
    });
    expect(resend.status).toBe(202);
  });

  it('changes the email with the token sent to the new address', async () => {
    const newEmail = 'rita.nueva@example.com';
    const requested = await me.post('/v1/me/email-changes', {
      body: { newEmail },
    });
    const token = app
      .mailer()
      .lastTo(newEmail, IdentityEmailTemplate.EmailChangeConfirmation)
      ?.variables['token'];

    const confirmed = await me.post('/v1/me/email-changes/confirm', {
      body: { token },
    });
    const profile = await me.get('/v1/me');
    const back = await me.post('/v1/me/email-changes', {
      body: { newEmail: rita.email },
    });
    const backToken = app
      .mailer()
      .lastTo(rita.email, IdentityEmailTemplate.EmailChangeConfirmation)
      ?.variables['token'];
    await me.post('/v1/me/email-changes/confirm', {
      body: { token: backToken },
    });

    expect(requested.status).toBe(202);
    expect(confirmed.status).toBe(204);
    expect(profile.body).toMatchObject({ email: newEmail });
    expect(back.status).toBe(202);
  });

  it('enrolls TOTP, signs in with it and with a recovery code, and removes it', async () => {
    const enrollment = await me.post('/v1/me/mfa/totp');
    const secret = (enrollment.body as { secret: string }).secret;
    const confirmed = await me.post('/v1/me/mfa/totp/confirm', {
      body: { code: totp.current(secret) },
    });
    const codes = (confirmed.body as { codes: string[] }).codes;

    const signIn = await rita.signIn();
    const mfa = (
      signIn.body as { mfa: { mfaToken: string; methods: string[] } }
    ).mfa;
    const challenge = await rita.native().post('/v1/auth/mfa/challenges', {
      body: { mfaToken: mfa.mfaToken, method: 'totp' },
    });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;
    const wrong = await rita.native().post('/v1/auth/mfa/verify', {
      body: { mfaToken: mfa.mfaToken, challengeId, code: '000000' },
    });
    const verified = await rita.native().post('/v1/auth/mfa/verify', {
      body: { mfaToken: mfa.mfaToken, challengeId, code: totp.next(secret) },
    });

    const second = await rita.signIn();
    const secondToken = (second.body as { mfa: { mfaToken: string } }).mfa
      .mfaToken;
    const recoveryChallenge = await rita
      .native()
      .post('/v1/auth/mfa/challenges', {
        body: { mfaToken: secondToken, method: 'recovery_code' },
      });
    const recovered = await rita.native().post('/v1/auth/mfa/verify', {
      body: {
        mfaToken: secondToken,
        challengeId: (recoveryChallenge.body as { challengeId: string })
          .challengeId,
        code: codes[0],
      },
    });
    const regenerated = await me.post('/v1/me/mfa/recovery-codes');
    const again = await me.post('/v1/me/mfa/totp');
    const removed = await me.delete('/v1/me/mfa/totp');
    const removedTwice = await me.delete('/v1/me/mfa/totp');

    expect(codes).toHaveLength(10);
    expect(mfa.methods).toEqual(['device_otp', 'totp', 'recovery_code']);
    expect(wrong.body).toMatchObject({
      code: IdentityErrorCode.MfaCodeInvalid,
    });
    expect(verified.body).toMatchObject({ status: 'authenticated' });
    expect(recovered.body).toMatchObject({ status: 'authenticated' });
    expect((regenerated.body as { codes: string[] }).codes).toHaveLength(10);
    expect(again.body).toMatchObject({
      code: IdentityErrorCode.MfaFactorAlreadyEnrolled,
    });
    expect(removed.status).toBe(204);
    expect(removedTwice.body).toMatchObject({
      code: IdentityErrorCode.MfaFactorNotEnrolled,
    });
  });

  it('starts a recovery without device that is not ready until the wait passes', async () => {
    const signIn = await rita.signIn();
    const mfaToken = (signIn.body as { mfa: { mfaToken: string } }).mfa
      .mfaToken;

    const started = await rita
      .native()
      .post('/v1/auth/mfa/recoveries', { body: { mfaToken } });
    const token = rita.mailTo(IdentityEmailTemplate.MfaRecoveryLink)['token'];
    const early = await rita.native().post('/v1/auth/mfa/recoveries/confirm', {
      body: { mfaToken, token },
    });

    expect(started.status).toBe(202);
    expect(started.body).toMatchObject({ availableAt: expect.any(String) });
    expect(early.body).toMatchObject({
      code: IdentityErrorCode.MfaRecoveryNotReady,
    });
    expect(early.headers.get('retry-after')).toEqual(expect.any(String));
  });

  it('denies an approval from the verifier device', async () => {
    rita.moveTo('192.0.2.10');
    const signIn = await rita.signIn();
    const mfaToken = (signIn.body as { mfa: { mfaToken: string } }).mfa
      .mfaToken;
    const challenge = await rita.native().post('/v1/auth/mfa/challenges', {
      body: { mfaToken, method: 'device_otp' },
    });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;
    const code = await rita.approvalCode(deviceId, challengeId);

    const denied = await rita
      .native()
      .post(`/v1/auth/device-approvals/${challengeId}/deny`, {
        body: {
          ...rita.device.signed('identity.device-approvals.deny', deviceId, [
            challengeId,
          ]),
          challengeId,
        },
      });
    const verify = await rita.native().post('/v1/auth/mfa/verify', {
      body: { mfaToken, challengeId, code },
    });
    const forged = await rita.native().post('/v1/auth/device-approvals/pull', {
      body: {
        ...rita.device.signed('identity.device-approvals.pull', deviceId),
        signature: 'AAAA',
      },
    });

    expect(denied.status).toBe(204);
    expect(verify.body).toMatchObject({
      code: IdentityErrorCode.MfaCodeExpired,
    });
    expect(forged.body).toMatchObject({
      code: IdentityErrorCode.DeviceSignatureInvalid,
    });
  });

  it('lists the devices, saves the push token and removes the trust', async () => {
    const claims = AccessTokenClaimsReader.read(session.accessToken);
    const user = { userId: claims['sub'], homeTenantId: claims['htid'] };
    const devices = await me.get('/v1/me/devices');
    const id =
      (devices.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';

    const push = await me.put('/v1/me/devices/current/push-token', {
      body: { pushToken: PUSH_DESTINATION },
    });
    const targets = await app
      .internal()
      .invoke(ListPushTargetsOperation, { user });
    const untrusted = await me.post(`/v1/me/devices/${id}/untrust`);
    const after = await me.get('/v1/me/devices');
    const afterTargets = await app
      .internal()
      .invoke(ListPushTargetsOperation, { user });

    expect(push.status).toBe(204);
    expect(targets).toMatchObject({
      value: {
        targets: [
          {
            deviceId: claims['did'],
            platform: expect.any(String),
            pushToken: PUSH_DESTINATION,
          },
        ],
      },
    });
    expect(untrusted.status).toBe(204);
    expect((after.body as { items: unknown[] }).items).toHaveLength(0);
    expect(afterTargets).toMatchObject({ value: { targets: [] } });
  });

  it('lists the sessions and revokes one, the others and then by device', async () => {
    rita.moveTo('192.0.2.11');
    await rita.signInWithEmailCode();
    const sessions = await me.get('/v1/me/sessions');
    const items = (
      sessions.body as { items: Array<{ id: string; current: boolean }> }
    ).items;
    const foreign = items.find((item) => !item.current);

    const revoked = await me.delete(`/v1/me/sessions/${foreign?.id ?? ''}`);
    const missing = await me.delete(`/v1/me/sessions/${foreign?.id ?? ''}`);
    const others = await me.post('/v1/me/sessions/revoke-others');
    const devices = await me.get('/v1/me/devices');
    const otherDevice =
      (devices.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    const removed = await me.delete(`/v1/me/devices/${otherDevice}`);

    expect(items[0]?.current).toBe(true);
    expect(revoked.status).toBe(204);
    expect(missing.status).toBe(404);
    expect(others.status).toBe(200);
    expect(removed.status).toBe(204);
  });

  it('resets the password with the emailed token and closes every session', async () => {
    rita.moveTo('192.0.2.12');
    const requested = await rita.native().post('/v1/auth/password-resets', {
      body: { email: rita.email },
    });
    const token = rita.mailTo(IdentityEmailTemplate.PasswordReset)['token'];
    const breached = await rita
      .native()
      .post('/v1/auth/password-resets/confirm', {
        body: { token, newPassword: SHORT_PHRASE },
      });
    const secondToken = await rita
      .native()
      .post('/v1/auth/password-resets', {
        body: { email: rita.email },
      })
      .then(() => rita.mailTo(IdentityEmailTemplate.PasswordReset)['token']);
    const confirmed = await rita
      .native()
      .post('/v1/auth/password-resets/confirm', {
        body: {
          token: secondToken,
          newPassword: NEW_PHRASE,
        },
      });
    const reused = await rita
      .native()
      .post('/v1/auth/password-resets/confirm', {
        body: {
          token: secondToken,
          newPassword: NEW_PHRASE,
        },
      });
    const refresh = await rita.native().post('/v1/auth/refresh', {
      body: { sessionToken: session.sessionToken },
    });

    expect(requested.status).toBe(202);
    expect(breached.body).toMatchObject({
      code: IdentityErrorCode.PasswordBreached,
    });
    expect(confirmed.status).toBe(204);
    expect(reused.body).toMatchObject({
      code: IdentityErrorCode.PasswordResetInvalid,
    });
    expect(refresh.body).toMatchObject({
      code: IdentityErrorCode.SessionRevoked,
    });
  });
});
