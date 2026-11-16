import { AccessTokenClaimsSchema } from '../schemas/access-token.schema.js';

const validClaims = {
  iss: 'https://identity.test',
  aud: 'api',
  sub: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
  tid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
  htid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03',
  sid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04',
  amr: ['pwd'],
  auth_time: 1_768_478_400,
  roles: [],
  proles: [],
  pv: '1.1',
  rgn: 'us',
  sxp: 1_768_507_200,
  iat: 1_768_478_400,
  exp: 1_768_479_000,
  jti: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05',
};

const REQUIRED_CLAIMS = [
  'iss',
  'aud',
  'sub',
  'tid',
  'htid',
  'sid',
  'amr',
  'auth_time',
  'roles',
  'proles',
  'pv',
  'rgn',
  'sxp',
  'iat',
  'exp',
  'jti',
] as const;

describe('AccessTokenClaimsSchema', () => {
  describe('valid claims', () => {
    it('accepts a complete set of claims', () => {
      expect(AccessTokenClaimsSchema.safeParse(validClaims).success).toBe(true);
    });

    it('accepts an optional did', () => {
      const result = AccessTokenClaimsSchema.safeParse({
        ...validClaims,
        did: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f06',
      });

      expect(result.success).toBe(true);
    });

    it('drops unknown claims from the parsed result', () => {
      const result = AccessTokenClaimsSchema.safeParse({
        ...validClaims,
        scope: 'read',
      });

      expect(result.success).toBe(true);
      expect(result.success && result.data).not.toHaveProperty('scope');
    });

    it.each([
      ['a lifetime of 600 seconds', 600],
      ['a lifetime of 900 seconds', 900],
    ])('accepts %s', (_name, lifetime) => {
      const result = AccessTokenClaimsSchema.safeParse({
        ...validClaims,
        exp: validClaims.iat + lifetime,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('missing claims', () => {
    it.each(REQUIRED_CLAIMS)('rejects a token without %s', (claim) => {
      const withoutClaim: Record<string, unknown> = { ...validClaims };
      delete withoutClaim[claim];

      expect(AccessTokenClaimsSchema.safeParse(withoutClaim).success).toBe(
        false,
      );
    });
  });

  describe('invalid values', () => {
    it.each<[string, Record<string, unknown>]>([
      ['an empty amr', { amr: [] }],
      ['a pv without a minor part', { pv: '1' }],
      ['a pv with letters', { pv: '1.x' }],
      ['an unknown audience', { aud: 'mobile' }],
      ['a sub that is not a UUID', { sub: '123' }],
      ['a UUIDv4 as the sub', { sub: '0192f1b4-7c3a-4d2e-9a41-5b6c7d8e9f01' }],
      ['a lifetime of 599 seconds', { exp: validClaims.iat + 599 }],
      ['a lifetime of 901 seconds', { exp: validClaims.iat + 901 }],
    ])('rejects %s', (_name, override) => {
      expect(
        AccessTokenClaimsSchema.safeParse({ ...validClaims, ...override })
          .success,
      ).toBe(false);
    });
  });
});
