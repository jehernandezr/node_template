import { AccessTokenClaimsSchema } from '@contracts/identity';
import { AccessTokenBuilder } from './utils/access-token-builder.js';
import { TestKeyPair } from './utils/test-key-pair.js';
import { JwtCodec } from '../jwt/jwt-codec.js';

const ISSUED_AT = 1_768_478_400;

describe('AccessTokenBuilder', () => {
  const keyPair = TestKeyPair.generate('k1');

  describe('the default token', () => {
    it('parses, verifies with the key pair and matches the claims schema', () => {
      const token = AccessTokenBuilder.aToken(ISSUED_AT).sign(keyPair);
      const parsed = JwtCodec.parse(token);

      expect(JwtCodec.verifySignature(parsed, keyPair.publicKey)).toBe(true);
      expect(AccessTokenClaimsSchema.safeParse(parsed.claims).success).toBe(
        true,
      );
    });

    it('carries the kid of the key pair in its header', () => {
      const parsed = JwtCodec.parse(
        AccessTokenBuilder.aToken(ISSUED_AT).sign(keyPair),
      );

      expect(parsed.header.kid).toBe('k1');
    });
  });

  describe('overrides', () => {
    it('changes only the requested claim and leaves the original builder untouched', () => {
      const original = AccessTokenBuilder.aToken(ISSUED_AT);

      const changed = JwtCodec.parse(
        original.withClaims({ pv: '2.2' }).sign(keyPair),
      );
      const untouched = JwtCodec.parse(original.sign(keyPair));

      expect(changed.claims).toMatchObject({ pv: '2.2', iat: ISSUED_AT });
      expect(untouched.claims).toMatchObject({ pv: '1.1' });
    });

    it('removes the requested claim', () => {
      const parsed = JwtCodec.parse(
        AccessTokenBuilder.aToken(ISSUED_AT).withoutClaim('sid').sign(keyPair),
      );

      expect(parsed.claims).not.toHaveProperty('sid');
    });

    it('replaces header fields such as alg and kid', () => {
      const parsed = JwtCodec.parse(
        AccessTokenBuilder.aToken(ISSUED_AT)
          .withHeader({ alg: 'HS256', kid: 'other' })
          .sign(keyPair),
      );

      expect(parsed.header).toMatchObject({ alg: 'HS256', kid: 'other' });
    });
  });
});
