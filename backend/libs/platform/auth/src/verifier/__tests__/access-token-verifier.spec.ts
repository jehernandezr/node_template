import { createHmac } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import {
  IdentityErrorCode,
  RevocationReason,
  TokenAudience,
} from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { ActorType } from '@platform/observability';
import type { AccessGrant } from '../../access/access-grant.js';
import { AuthErrorCode } from '../../errors/auth-error-code.enum.js';
import { AccessTokenBuilder } from '../../__tests__/utils/access-token-builder.js';
import { TestKeyPair } from '../../__tests__/utils/test-key-pair.js';
import { JwksKeySource } from '../../jwks/jwks-key-source.js';
import { AccessTokenFormat } from '../../jwt/access-token-format.js';
import { VerifierHarness } from './utils/verifier-harness.js';

const USER_ID = VerifierHarness.USER_ID;
const TENANT_ID = VerifierHarness.TENANT_ID;
const SESSION_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04';
/** `jti` of the test access token. */
const JTI = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05';
const UNAUTHENTICATED = PlatformErrorCode.AuthUnauthenticated;

/** Key source that simulates a down JWKS. */
class FailingKeySource extends JwksKeySource {
  override async keyFor(): Promise<KeyObject | undefined> {
    throw new Error('jwks down');
  }
}

const grantWith = (permissionVersion: string): AccessGrant => ({
  permissions: [],
  platformRoles: [],
  features: [],
  flags: [],
  permissionVersion,
});

const setVersions = async (
  harness: VerifierHarness,
  tenant: number,
  user: number,
): Promise<void> => {
  await harness.state.setPermissionVersion(TENANT_ID, undefined, tenant);
  await harness.state.setPermissionVersion(TENANT_ID, USER_ID, user);
};

/** Token with alg HS256 signed with the PEM public key, the classic algorithm confusion attack. */
const hs256Token = (harness: VerifierHarness): string => {
  const pem = harness.keyPair.publicKey.export({
    type: 'spki',
    format: 'pem',
  });
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'at+jwt', kid: 'k1' }),
  ).toString('base64url');
  const payload = harness.token().split('.')[1] ?? '';
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', pem)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
};

/** Token with another sub's payload pasted over the original signature, which no longer matches it. */
const payloadSwapped = (harness: VerifierHarness, sub: string): string => {
  const [header, , signature] = harness.token().split('.');
  const [, payload] = harness
    .token(AccessTokenBuilder.aToken(harness.nowSeconds).withClaims({ sub }))
    .split('.');
  return `${header}.${payload}.${signature}`;
};

describe('AccessTokenVerifier', () => {
  describe('a valid token', () => {
    it('returns the user actor without deviceId when the token has no did', async () => {
      const harness = await VerifierHarness.create();

      const actor = await harness.verify(harness.token());

      expect(actor).toEqual({
        kind: ActorType.User,
        userId: USER_ID,
        tenantId: TENANT_ID,
        homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03',
        sessionId: SESSION_ID,
        audience: TokenAudience.Api,
        authMethods: ['pwd'],
        authTime: harness.nowSeconds,
        roles: [],
        platformRoles: [],
        permissionVersion: '1.1',
        region: 'us',
        sessionExpiresAt: harness.nowSeconds + 28_800,
        tokenId: JTI,
      });
      expect(actor).not.toHaveProperty('deviceId');
    });

    it('includes deviceId when the token carries did', async () => {
      const harness = await VerifierHarness.create();
      const deviceId = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f06';

      const actor = await harness.verify(
        harness.token(
          AccessTokenBuilder.aToken(harness.nowSeconds).withClaims({
            did: deviceId,
          }),
        ),
      );

      expect(actor.deviceId).toBe(deviceId);
    });
  });

  describe('tokens rejected as UNAUTHENTICATED', () => {
    it.each<[string, (harness: VerifierHarness) => string]>([
      [
        'alg none',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({ alg: 'none' }),
          ),
      ],
      ['alg HS256 with a forged signature', (h) => hs256Token(h)],
      [
        'typ JWT',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({ typ: 'JWT' }),
          ),
      ],
      [
        'a crit header',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({
              crit: ['exp'],
            }),
          ),
      ],
      [
        'an empty kid',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({ kid: '' }),
          ),
      ],
      [
        'a kid longer than the limit',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({
              kid: 'k'.repeat(AccessTokenFormat.MAX_KID_LENGTH + 1),
            }),
          ),
      ],
      ['a token longer than the limit', () => 'a'.repeat(8193)],
      [
        'an unknown kid',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withHeader({
              kid: 'unknown',
            }),
          ),
      ],
      [
        'a signature from another key with the same kid',
        (h) =>
          AccessTokenBuilder.aToken(h.nowSeconds).sign(
            TestKeyPair.generate('k1'),
          ),
      ],
      ['a payload changed after signing', (h) => payloadSwapped(h, 'attacker')],
      [
        'an unexpected issuer',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withClaims({
              iss: 'https://evil.test',
            }),
          ),
      ],
      [
        'a token issued by the identity of another region, signed with the same keys',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withClaims({
              iss: 'https://identity.region-b.test',
            }),
          ),
      ],
      [
        'a missing sid',
        (h) =>
          h.token(AccessTokenBuilder.aToken(h.nowSeconds).withoutClaim('sid')),
      ],
      [
        'a lifetime of 1200 seconds',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds).withClaims({
              exp: h.nowSeconds + 1200,
            }),
          ),
      ],
      [
        'an iat 31 seconds in the future',
        (h) =>
          h.token(
            AccessTokenBuilder.aToken(h.nowSeconds + 31).withClaims({
              exp: h.nowSeconds + 631,
            }),
          ),
      ],
    ])('rejects %s', async (_name, build) => {
      const harness = await VerifierHarness.create();

      await expect(harness.verify(build(harness))).rejects.toMatchObject({
        code: UNAUTHENTICATED,
      });
    });

    it('rejects a valid token presented for another audience', async () => {
      const harness = await VerifierHarness.create();

      await expect(
        harness.verify(harness.token(), TokenAudience.Backoffice),
      ).rejects.toMatchObject({ code: UNAUTHENTICATED });
    });
  });

  describe('time tolerance', () => {
    it('accepts a token that expired 29 seconds ago', async () => {
      const harness = await VerifierHarness.create();
      const token = harness.token(
        AccessTokenBuilder.aToken(harness.nowSeconds - 629),
      );

      await expect(harness.verify(token)).resolves.toMatchObject({
        tokenId: expect.any(String),
      });
    });

    it('rejects a token that expired 31 seconds ago with TOKEN_EXPIRED', async () => {
      const harness = await VerifierHarness.create();
      const token = harness.token(
        AccessTokenBuilder.aToken(harness.nowSeconds - 631),
      );

      await expect(harness.verify(token)).rejects.toMatchObject({
        code: AuthErrorCode.TokenExpired,
      });
    });

    it('accepts a token issued 29 seconds in the future', async () => {
      const harness = await VerifierHarness.create();
      const token = harness.token(
        AccessTokenBuilder.aToken(harness.nowSeconds + 29),
      );

      await expect(harness.verify(token)).resolves.toMatchObject({
        tokenId: expect.any(String),
      });
    });
  });

  describe('state revocations', () => {
    it.each<[string, (harness: VerifierHarness) => Promise<void>, string]>([
      [
        'a revoked session',
        (h) =>
          h.state.revokeSession(SESSION_ID, 60_000, RevocationReason.Logout),
        IdentityErrorCode.SessionRevoked,
      ],
      [
        'a user epoch after the token was issued',
        (h) =>
          h.state.setUserEpoch(USER_ID, {
            revokedBefore: h.nowSeconds + 1,
            suspended: false,
          }),
        IdentityErrorCode.TokenRevoked,
      ],
      [
        'a suspended user',
        (h) =>
          h.state.setUserEpoch(USER_ID, { revokedBefore: 0, suspended: true }),
        IdentityErrorCode.UserSuspended,
      ],
      [
        'a suspended tenant',
        (h) =>
          h.state.setTenantEpoch(TENANT_ID, {
            revokedBefore: 0,
            suspended: true,
          }),
        IdentityErrorCode.TenantSuspended,
      ],
      [
        'a tenant epoch after the token was issued',
        (h) =>
          h.state.setTenantEpoch(TENANT_ID, {
            revokedBefore: h.nowSeconds + 1,
            suspended: false,
          }),
        IdentityErrorCode.TokenRevoked,
      ],
    ])('rejects %s', async (_name, prepare, code) => {
      const harness = await VerifierHarness.create();
      await prepare(harness);

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code,
      });
    });

    it('accepts a user epoch equal to the token issue time', async () => {
      const harness = await VerifierHarness.create();
      await harness.state.setUserEpoch(USER_ID, {
        revokedBefore: harness.nowSeconds,
        suspended: false,
      });

      await expect(harness.verify(harness.token())).resolves.toMatchObject({
        userId: USER_ID,
      });
    });
  });

  describe('permission versions', () => {
    it.each([
      ['a tenant version behind the stored one', 2, 1],
      ['a user version behind the stored one', 1, 2],
      ['both versions behind the stored one', 2, 0],
    ])(
      'rejects a token with %s as STALE_PERMISSIONS',
      async (_name, tenant, user) => {
        const harness = await VerifierHarness.create();
        await setVersions(harness, tenant, user);

        await expect(harness.verify(harness.token())).rejects.toMatchObject({
          code: IdentityErrorCode.TokenStalePermissions,
        });
      },
    );

    it.each([
      ['equal versions', 1, 1],
      ['a user version ahead of the token', 1, 0],
      ['a tenant version ahead of the token', 0, 1],
    ])('accepts a token with %s', async (_name, tenant, user) => {
      const harness = await VerifierHarness.create();
      await setVersions(harness, tenant, user);

      await expect(harness.verify(harness.token())).resolves.toMatchObject({
        permissionVersion: '1.1',
      });
    });

    it('takes the version from the grant when the state has none', async () => {
      const harness = await VerifierHarness.create({ withVersions: false });
      harness.access.grant = grantWith('1.1');

      await expect(harness.verify(harness.token())).resolves.toMatchObject({
        permissionVersion: '1.1',
      });
    });

    it('rejects a token older than the version in the grant', async () => {
      const harness = await VerifierHarness.create({ withVersions: false });
      harness.access.grant = grantWith('1.2');

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code: IdentityErrorCode.TokenStalePermissions,
      });
    });
  });

  describe('check order', () => {
    it('reports an expired token before a revoked session', async () => {
      const harness = await VerifierHarness.create();
      await harness.state.revokeSession(
        SESSION_ID,
        60_000,
        RevocationReason.Logout,
      );
      const expired = harness.token(
        AccessTokenBuilder.aToken(harness.nowSeconds - 1000),
      );

      await expect(harness.verify(expired)).rejects.toMatchObject({
        code: AuthErrorCode.TokenExpired,
      });
    });

    it('reports an expired session before a revoked session', async () => {
      const harness = await VerifierHarness.create();
      await harness.state.revokeSession(
        SESSION_ID,
        60_000,
        RevocationReason.Logout,
      );
      const token = harness.token(
        AccessTokenBuilder.aToken(harness.nowSeconds).withClaims({
          sxp: harness.nowSeconds - 1,
        }),
      );

      await expect(harness.verify(token)).rejects.toMatchObject({
        code: IdentityErrorCode.SessionExpired,
      });
    });

    it('reports a suspended user before a suspended tenant', async () => {
      const harness = await VerifierHarness.create();
      await harness.state.setUserEpoch(USER_ID, {
        revokedBefore: harness.nowSeconds + 1,
        suspended: true,
      });
      await harness.state.setTenantEpoch(TENANT_ID, {
        revokedBefore: 0,
        suspended: true,
      });

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code: IdentityErrorCode.UserSuspended,
      });
    });
  });

  describe('dependency failures', () => {
    it.each([
      'isSessionRevoked',
      'userEpoch',
      'tenantEpoch',
      'permissionVersion',
    ] as const)('reports CIRCUIT_OPEN when %s fails', async (failing) => {
      const harness = await VerifierHarness.create();
      harness.reader.failOn = failing;

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });

    it('reports CIRCUIT_OPEN when there is no version and the grant resolver fails', async () => {
      const harness = await VerifierHarness.create({ withVersions: false });
      harness.access.failure = new Error('down');

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });

    it('reports CIRCUIT_OPEN when the key source fails', async () => {
      const harness = await VerifierHarness.create({
        keys: new FailingKeySource(),
      });

      await expect(harness.verify(harness.token())).rejects.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });
  });
});
