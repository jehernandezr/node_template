import { generateKeyPairSync } from 'node:crypto';
import { AuthErrorCode } from '../../errors/auth-error-code.enum.js';
import { JwkCodec } from '../jwk-codec.js';

const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const validJwk = {
  kty: 'EC',
  crv: 'P-256',
  x: 'A'.repeat(43),
  y: 'B'.repeat(43),
};

describe('JwkCodec', () => {
  describe('toPublicJwk and publicKeyFromJwk', () => {
    it('keeps the same coordinates after a round trip', () => {
      const jwk = JwkCodec.toPublicJwk(ec.publicKey, 'k1');

      const exported = JwkCodec.publicKeyFromJwk(jwk).export({ format: 'jwk' });

      expect(exported.x).toBe(jwk.x);
      expect(exported.y).toBe(jwk.y);
    });

    it('omits the private component and declares use and alg', () => {
      const jwk = JwkCodec.toPublicJwk(ec.privateKey, 'k1');

      expect(jwk).not.toHaveProperty('d');
      expect(jwk.use).toBe('sig');
      expect(jwk.alg).toBe('ES256');
    });
  });

  describe('toPublicJwk rejections', () => {
    it('throws INVALID_KEY when the kid is empty', () => {
      expect(() => JwkCodec.toPublicJwk(ec.publicKey, '')).toThrow(
        expect.objectContaining({ code: AuthErrorCode.InvalidKey }),
      );
    });

    it('throws INVALID_KEY for an Ed25519 key', () => {
      const ed = generateKeyPairSync('ed25519');

      expect(() => JwkCodec.toPublicJwk(ed.publicKey, 'k1')).toThrow(
        expect.objectContaining({ code: AuthErrorCode.InvalidKey }),
      );
    });
  });

  describe('publicKeyFromJwk rejections', () => {
    it.each([
      ['an RSA key type', { ...validJwk, kty: 'RSA' }],
      ['a P-384 curve', { ...validJwk, crv: 'P-384' }],
      ['no x coordinate', { kty: 'EC', crv: 'P-256', y: validJwk.y }],
      ['an x of 42 characters', { ...validJwk, x: 'A'.repeat(42) }],
      [
        'a point outside the curve',
        { ...validJwk, x: 'A'.repeat(43), y: 'A'.repeat(43) },
      ],
      ['a private component', { ...validJwk, d: 'A'.repeat(43) }],
      ['a string instead of an object', 'jwk'],
      ['null', null],
    ])('throws INVALID_KEY for %s', (_name, jwk) => {
      expect(() => JwkCodec.publicKeyFromJwk(jwk)).toThrow(
        expect.objectContaining({ code: AuthErrorCode.InvalidKey }),
      );
    });
  });
});
