import { IdentityErrorCode, IdentityRoute } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { HttpTestClient } from '@platform/http/test-utils';
import { IdentityTestApp } from '../src/__tests__/utils/index.js';
import {
  AccessTokenClaimsReader,
  IdentityJourney,
  SoftwareAuthenticator,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('passkeys end to end', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const sara = new IdentityJourney(app, 'sara.passkey@example.com');
  const authenticator = new SoftwareAuthenticator(IdentityTestApp.WEB_ORIGIN);
  let session: SessionTokensBody;
  let me: HttpTestClient;
  let passkeyId: string;

  beforeAll(async () => {
    await app.start();
    await sara.register();
    session = await sara.signInWithEmailCode();
    me = sara.bearer(session.accessToken);
  });

  afterAll(async () => {
    await app.stop();
  });

  it('registers a passkey after a recent second factor', async () => {
    const options = await me.post('/v1/me/passkeys/registration-options');
    const { challengeId, optionsJson } = options.body as {
      challengeId: string;
      optionsJson: string;
    };

    const registered = await me.post('/v1/me/passkeys', {
      body: {
        challengeId,
        credentialJson: authenticator.create(optionsJson),
        name: 'Laptop',
      },
    });
    const replayed = await me.post('/v1/me/passkeys', {
      body: {
        challengeId,
        credentialJson: authenticator.create(optionsJson),
        name: 'Another',
      },
    });
    const listed = await me.get('/v1/me/passkeys');
    passkeyId = (registered.body as { id: string }).id;

    expect(registered.status).toBe(201);
    expect(replayed.body).toMatchObject({
      code: IdentityErrorCode.PasskeyChallengeExpired,
    });
    expect(listed.body).toMatchObject({
      items: [expect.objectContaining({ name: 'Laptop' })],
    });
    const claims = AccessTokenClaimsReader.read(session.accessToken);
    const user = {
      userId: String(claims['sub']),
      homeTenantId: String(claims['htid']),
    };
    const probe = app.shards();
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM passkeys WHERE id = '${passkeyId}' AND user_id = '${user.userId}'`,
      ),
    ).toEqual([await probe.shardOfUser(user)]);
    expect(
      await probe.catalogRows(
        `SELECT home_tenant_id FROM passkey_lookup WHERE user_id = '${user.userId}'`,
      ),
    ).toEqual([{ home_tenant_id: user.homeTenantId }]);
  });

  it('signs in with the passkey from the registered device without a password', async () => {
    const options = await sara.native().post('/v1/auth/passkeys/options');
    const { challengeId, optionsJson } = options.body as {
      challengeId: string;
      optionsJson: string;
    };

    const verified = await sara.native().post('/v1/auth/passkeys/verify', {
      body: {
        challengeId,
        credentialJson: authenticator.get(optionsJson),
        device: sara.device.signed(
          IdentityRoute.PasskeySignInVerify,
          IdentityJourney.deviceIdFrom(session.accessToken),
          [challengeId],
        ),
      },
    });
    const tokens = (verified.body as { tokens: SessionTokensBody }).tokens;

    expect(verified.body).toMatchObject({ status: 'authenticated' });
    expect(AccessTokenClaimsReader.read(tokens.accessToken)).toMatchObject({
      amr: ['passkey', 'device'],
    });
  });

  it('asks for a second factor from an unknown device and accepts the passkey as that factor', async () => {
    const signIn = await sara.signIn();
    const mfa = (
      signIn.body as { mfa: { mfaToken: string; methods: string[] } }
    ).mfa;
    const options = await sara.native().post('/v1/auth/mfa/passkey/options', {
      body: { mfaToken: mfa.mfaToken },
    });
    const { challengeId, optionsJson } = options.body as {
      challengeId: string;
      optionsJson: string;
    };

    const verified = await sara.native().post('/v1/auth/mfa/passkey/verify', {
      body: {
        mfaToken: mfa.mfaToken,
        challengeId,
        credentialJson: authenticator.get(optionsJson),
      },
    });

    expect(mfa.methods).toContain('passkey');
    expect(verified.body).toMatchObject({ status: 'authenticated' });
  });

  it('elevates a session with the passkey and removes it afterwards', async () => {
    const stepUp = await me.post('/v1/me/step-up');
    const mfaToken = (stepUp.body as { mfaToken: string }).mfaToken;
    const options = await me.post('/v1/me/step-up/passkey/options', {
      body: { mfaToken },
    });
    const { challengeId, optionsJson } = options.body as {
      challengeId: string;
      optionsJson: string;
    };

    const verified = await me.post('/v1/me/step-up/passkey/verify', {
      body: {
        mfaToken,
        challengeId,
        credentialJson: authenticator.get(optionsJson),
      },
    });
    const forged = await sara.native().post('/v1/auth/passkeys/verify', {
      body: {
        challengeId: challengeId,
        credentialJson: Buffer.from('no-json').toString('base64url'),
      },
    });
    const removed = await me.delete(`/v1/me/passkeys/${passkeyId}`);
    const missing = await me.delete(`/v1/me/passkeys/${passkeyId}`);

    expect(verified.body).toMatchObject({ mfaVerifiedAt: expect.any(String) });
    expect(forged.body).toMatchObject({
      code: IdentityErrorCode.PasskeyChallengeExpired,
    });
    expect(removed.status).toBe(204);
    expect(missing.status).toBe(404);
  });
});
