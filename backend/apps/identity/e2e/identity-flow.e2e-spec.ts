import { PlatformErrorCode } from '@contracts/platform';
import { IdentityErrorCode } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { IdentityTestApp } from '../src/__tests__/utils/index.js';
import { IdentityEmailTemplate } from '../src/shared/enums/identity-email-template.enum.js';
import {
  AccessTokenClaimsReader,
  IdentityJourney,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);

/** The grace of the previous generation is 5 s: the test waits a little longer to present it outside of it. */
const PAST_REFRESH_GRACE_MS = 5_500;

runtime.describeIfAvailable('identity end to end', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const ana = new IdentityJourney(app, 'ana.flow@example.com');
  let first: SessionTokensBody;
  let fromBrowser: SessionTokensBody;
  let deviceId: string;

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('signs up and mails the verification in the language of the sign-up', async () => {
    await ana.register();

    expect(
      app.mailer().lastTo(ana.email, IdentityEmailTemplate.EmailVerification),
    ).toMatchObject({ locale: 'es-MX' });
  });

  it('asks for the email code from a new device', async () => {
    const signIn = await ana.signIn();

    expect(signIn.body).toMatchObject({
      status: 'mfa_required',
      mfa: { methods: ['email_otp'] },
    });
  });

  it('verifies the email code, opens the session and registers the verifier device', async () => {
    first = await ana.signInWithEmailCode();
    deviceId = IdentityJourney.deviceIdFrom(first.accessToken);

    expect(first.sessionToken).toMatch(/^st1_/);
    expect(AccessTokenClaimsReader.read(first.accessToken)).toMatchObject({
      did: expect.any(String),
      amr: ['pwd', 'email_otp'],
    });
  });

  it('reads the access of the session with the access token', async () => {
    const access = await ana.bearer(first.accessToken).get('/v1/me/access');

    expect(access.status).toBe(200);
    expect(access.body).toMatchObject({
      tenantId: app.env()['IDENTITY_DEFAULT_TENANT_ID'],
      mfaVerifiedAt: expect.any(String),
    });
  });

  it('rotates on refresh and revokes the session when the old token comes back', async () => {
    const refresh = await ana.native().post('/v1/auth/refresh', {
      body: { sessionToken: first.sessionToken },
    });
    expect(refresh.status).toBe(200);
    const rotated = refresh.body as SessionTokensBody;
    expect(rotated.sessionToken).not.toBe(first.sessionToken);

    await new Promise((resolve) => setTimeout(resolve, PAST_REFRESH_GRACE_MS));
    const reused = await ana.native().post('/v1/auth/refresh', {
      body: { sessionToken: first.sessionToken },
    });
    expect(reused.body).toMatchObject({
      code: IdentityErrorCode.SessionReused,
    });

    const revoked = await ana.bearer(rotated.accessToken).get('/v1/me/access');
    expect(revoked.body).toMatchObject({
      code: IdentityErrorCode.SessionRevoked,
    });
  });

  it('signs in from another browser with the code the verifier device pulls', async () => {
    const signIn = await ana.signIn();
    const mfa = (
      signIn.body as { mfa: { mfaToken: string; methods: string[] } }
    ).mfa;
    expect(mfa.methods).toEqual(['device_otp']);
    const challenge = await ana.native().post('/v1/auth/mfa/challenges', {
      body: { mfaToken: mfa.mfaToken, method: 'device_otp' },
    });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;

    const code = await ana.approvalCode(deviceId, challengeId);
    const verify = await ana.native().post('/v1/auth/mfa/verify', {
      body: { mfaToken: mfa.mfaToken, challengeId, code },
    });

    expect(code).toMatch(/^\d{8}$/);
    expect(verify.body).toMatchObject({ status: 'authenticated' });
    fromBrowser = (verify.body as { tokens: SessionTokensBody }).tokens;
  });

  it('asks for step-up to change the password and then revokes the other sessions', async () => {
    const recognized = await ana.signInFromDevice(deviceId);
    const session = (recognized.body as { tokens: SessionTokensBody }).tokens;
    const newPassword = ['Another', 'long', 'different', 'phrase', '2026'].join(
      '-',
    );
    const change = { currentPassword: IdentityJourney.PASSWORD, newPassword };

    const blocked = await ana
      .bearer(session.accessToken)
      .post('/v1/me/password', {
        body: change,
      });
    expect(blocked.body).toMatchObject({
      code: IdentityErrorCode.MfaStepUpRequired,
    });

    const stepUp = await ana.bearer(session.accessToken).post('/v1/me/step-up');
    const mfaToken = (stepUp.body as { mfaToken: string }).mfaToken;
    const challenge = await ana
      .bearer(session.accessToken)
      .post('/v1/me/step-up/challenges', {
        body: { mfaToken, method: 'device_otp' },
      });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;
    const verified = await ana
      .bearer(session.accessToken)
      .post('/v1/me/step-up/verify', {
        body: {
          mfaToken,
          challengeId,
          code: await ana.approvalCode(deviceId, challengeId),
        },
      });
    const elevated = (verified.body as { tokens: { accessToken: string } })
      .tokens.accessToken;

    const changed = await ana
      .bearer(elevated)
      .post('/v1/me/password', { body: change });
    const other = await ana.native().post('/v1/auth/refresh', {
      body: { sessionToken: fromBrowser.sessionToken },
    });

    expect(changed.status).toBe(204);
    expect(other.body).toMatchObject({
      code: IdentityErrorCode.SessionRevoked,
    });
  });

  it('closes the session on sign-out so the refresh is rejected', async () => {
    const bob = new IdentityJourney(app, 'bob.exit@example.com');
    await bob.register();
    const session = await bob.signInWithEmailCode();

    const signOut = await bob.native().post('/v1/auth/sign-out', {
      body: { sessionToken: session.sessionToken },
    });
    const refresh = await bob.native().post('/v1/auth/refresh', {
      body: { sessionToken: session.sessionToken },
    });

    expect(signOut.status).toBe(204);
    expect(refresh.body).toMatchObject({
      code: IdentityErrorCode.SessionRevoked,
    });
  });

  it('keeps the session token in the cookie for a web client and in the body for the app', async () => {
    const carla = new IdentityJourney(app, 'carla.web@example.com');
    await carla.register();
    const web = carla.web().withHeaders({ Origin: IdentityTestApp.WEB_ORIGIN });
    const signIn = await carla.signIn(web);
    const mfaToken = (signIn.body as { mfa: { mfaToken: string } }).mfa
      .mfaToken;
    const challenge = await web.post('/v1/auth/mfa/challenges', {
      body: { mfaToken, method: 'email_otp' },
    });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;

    const verify = await web.post('/v1/auth/mfa/verify', {
      body: {
        mfaToken,
        challengeId,
        code: carla.mailTo(IdentityEmailTemplate.MfaCode)['code'],
      },
    });
    const cookie = verify.headers.get('set-cookie') ?? '';
    const refresh = await web
      .withHeaders({ Cookie: cookie.split(';')[0] ?? '' })
      .post('/v1/auth/refresh');

    expect(cookie).toMatch(/^__Host-session=st1_/);
    expect(JSON.stringify(verify.body)).not.toContain('st1_');
    expect(refresh.status).toBe(200);
    expect(JSON.stringify(refresh.body)).not.toContain('st1_');
    expect(refresh.headers.get('set-cookie')).toMatch(/^__Host-session=st1_/);
    const native = await carla.native().post('/v1/auth/sign-in', {
      body: { email: carla.email, password: IdentityJourney.PASSWORD },
    });
    expect(native.body).toMatchObject({ status: 'mfa_required' });
    const foreign = await carla.signIn(
      carla.web().withHeaders({ Origin: 'https://evil.test' }),
    );
    expect(foreign.body).toMatchObject({
      code: PlatformErrorCode.AuthOriginRejected,
    });
  });

  it('locks the sign-in after five failures, also for an unknown email', async () => {
    const stranger = new IdentityJourney(app, 'nobody.registered@example.com');
    const attempts = [1, 2, 3, 4, 5];

    const responses = [];
    for (const attempt of attempts) {
      responses.push(
        await stranger.signIn(stranger.native(), `wrong-password-${attempt}`),
      );
    }

    expect(responses.at(-1)?.status).toBe(401);
    expect(responses.at(-1)?.headers.get('retry-after')).toEqual(
      expect.any(String),
    );
    expect(responses[0]?.headers.get('retry-after')).toBeNull();
  });
});
