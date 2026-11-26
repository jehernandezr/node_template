import {
  MfaFactor,
  TenantKind,
  TenantLifecycle,
  type TenantSummary,
} from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { HttpTestResponse } from '@platform/http/test-utils';
import {
  AccessTokenClaimsReader,
  DeviceKey,
  IdentityJourney,
  IdentityTestApp,
  RuntimeTestValue,
  TotpCodes,
  type SessionTokensBody,
} from '../../__tests__/utils/index.js';
import { SeedSmokeAccount } from '../seed-smoke-account.js';

const runtime = new ContainerRuntime(process.env);
const EMAIL = 'success@simulator.amazonses.com';
const PASSPHRASE = RuntimeTestValue.hyphenated(
  'smoke',
  'account',
  'phrase',
  'one',
);
const TOTP_SECRET = RuntimeTestValue.concatenated('MZXW6YTB', 'OJTG633CMFZA');

runtime.describeIfAvailable('smoke account seed', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const totp = new TotpCodes();
  let smoke: IdentityJourney;

  const signInWithTotp = async (
    code: string,
  ): Promise<{ verify: HttpTestResponse; methods: readonly string[] }> => {
    const signIn = await smoke.native().post('/v1/auth/sign-in', {
      body: { email: EMAIL, password: PASSPHRASE },
    });
    IdentityJourney.expectStatus(signIn, 200);
    const mfa = (
      signIn.body as { mfa: { mfaToken: string; methods: string[] } }
    ).mfa;
    const challenge = await smoke.native().post('/v1/auth/mfa/challenges', {
      body: { mfaToken: mfa.mfaToken, method: MfaFactor.Totp },
    });
    const verify = await smoke.native().post('/v1/auth/mfa/verify', {
      body: {
        mfaToken: mfa.mfaToken,
        challengeId: (challenge.body as { challengeId: string }).challengeId,
        code,
        devicePublicKey: new DeviceKey().publicKey,
      },
    });
    return { verify, methods: mfa.methods };
  };

  beforeAll(async () => {
    await app.start({
      IDENTITY_SMOKE_ACCOUNT: JSON.stringify({
        email: EMAIL,
        password: PASSPHRASE,
        totpSecret: TOTP_SECRET,
      }),
    });
    smoke = new IdentityJourney(app, EMAIL);
  });

  afterAll(async () => {
    await app.stop();
  });

  it('creates the owner of an active smoke tenant who signs in from a new device with the TOTP', async () => {
    await expect(app.get(SeedSmokeAccount).execute()).resolves.toBe(true);

    const { verify, methods } = await signInWithTotp(totp.current(TOTP_SECRET));
    const tokens = (verify.body as { tokens: SessionTokensBody }).tokens;
    const tenant = await smoke.bearer(tokens.accessToken).get('/v1/tenant');

    expect(verify.status).toBe(200);
    expect(methods).toContain(MfaFactor.Totp);
    expect(AccessTokenClaimsReader.read(tokens.accessToken)['tid']).toBe(
      (tenant.body as TenantSummary).id,
    );
    expect(tenant.body).toMatchObject({
      slug: `smoke-${app.env()['IDENTITY_REGION']}`,
      kind: TenantKind.Organization,
      status: TenantLifecycle.Active,
    });
  });

  it('seeds again without a second account, revoking the sessions and accepting the same TOTP step', async () => {
    const { verify: before } = await signInWithTotp(totp.next(TOTP_SECRET));
    const earlier = (before.body as { tokens: SessionTokensBody }).tokens;

    await expect(app.get(SeedSmokeAccount).execute()).resolves.toBe(true);
    const revoked = await smoke.bearer(earlier.accessToken).get('/v1/tenant');
    const { verify: after } = await signInWithTotp(totp.next(TOTP_SECRET));

    expect(before.status).toBe(200);
    expect(revoked.status).toBe(401);
    expect(after.status).toBe(200);
  });
});
