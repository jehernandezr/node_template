import { createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { PlatformErrorCode } from '@contracts/platform';
import { JwtCodec } from '../jwt-codec.js';

const RFC_7515_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
  y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
};

/** Token de ejemplo del RFC 7515, apéndice A.3, por partes: cabecera, payload y firma. */
const RFC_7515_TOKEN = [
  'eyJhbGciOiJFUzI1NiJ9',
  'eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ',
  'DtEhU3ljbEg8L38VWAfUAqOyKAM6-Xx-F4GawxaepmXFCgfTjDxw5djxLa8ISlSApmWQxfKTUJqPP3-Kg6NU1Q',
].join('.');

const HEADER = { alg: 'ES256', typ: 'at+jwt', kid: 'k1' };
const CLAIMS = { sub: 'user-1', iat: 1_700_000_000 };

const encode = (value: string): string =>
  Buffer.from(value).toString('base64url');

const encodeJson = (value: unknown): string => encode(JSON.stringify(value));

const generatePair = (): { privateKey: KeyObject; publicKey: KeyObject } =>
  generateKeyPairSync('ec', { namedCurve: 'P-256' });

/** Reemplaza el payload de un token firmado y deja la firma original. */
const withPayload = (token: string, claims: unknown): string => {
  const [header, , signature] = token.split('.');
  return `${header}.${encodeJson(claims)}.${signature}`;
};

/** Reemplaza la firma de un token por otra cadena base64url. */
const withSignature = (token: string, signature: string): string => {
  const [header, payload] = token.split('.');
  return `${header}.${payload}.${signature}`;
};

/** Firma DER: la que sale de `sign` sin `dsaEncoding`. */
const derToken = (privateKey: KeyObject): string => {
  const signingInput = `${encodeJson(HEADER)}.${encodeJson(CLAIMS)}`;
  const signature = sign('sha256', Buffer.from(signingInput), privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
};

describe('JwtCodec', () => {
  describe('RFC 7515 vector', () => {
    it('verifies the published ES256 example and reads its header', () => {
      const publicKey = createPublicKey({
        key: RFC_7515_JWK,
        format: 'jwk',
      });

      const parsed = JwtCodec.parse(RFC_7515_TOKEN);

      expect(JwtCodec.verifySignature(parsed, publicKey)).toBe(true);
      expect(parsed.header.alg).toBe('ES256');
    });
  });

  describe('sign and parse round trip', () => {
    const { privateKey, publicKey } = generatePair();
    const token = JwtCodec.sign(HEADER, CLAIMS, privateKey);

    it('returns the same header and claims that were signed', () => {
      const parsed = JwtCodec.parse(token);

      expect(parsed.header).toEqual(HEADER);
      expect(parsed.claims).toEqual(CLAIMS);
    });

    it('verifies the signature with the matching public key', () => {
      expect(JwtCodec.verifySignature(JwtCodec.parse(token), publicKey)).toBe(
        true,
      );
    });

    it('produces a 64-byte signature and a base64url token', () => {
      const parsed = JwtCodec.parse(token);

      expect(parsed.signature.length).toBe(64);
      expect(token).not.toMatch(/[=+/]/);
    });
  });

  describe('verification failures', () => {
    const { privateKey, publicKey } = generatePair();
    const token = JwtCodec.sign(HEADER, CLAIMS, privateKey);
    const flippedSignature = (() => {
      const bytes = Buffer.from(token.split('.')[2] ?? '', 'base64url');
      bytes[0] = (bytes[0] ?? 0) ^ 0xff;
      return bytes.toString('base64url');
    })();
    const otherPair = generatePair();

    it.each<[string, string, KeyObject]>([
      [
        'payload changed after signing',
        withPayload(token, { ...CLAIMS, sub: 'attacker' }),
        publicKey,
      ],
      [
        'one signature byte changed',
        withSignature(token, flippedSignature),
        publicKey,
      ],
      ['verified with another key', token, otherPair.publicKey],
    ])('returns false when %s', (_name, candidate, key) => {
      expect(JwtCodec.verifySignature(JwtCodec.parse(candidate), key)).toBe(
        false,
      );
    });
  });

  describe('malformed tokens', () => {
    const { privateKey } = generatePair();
    const validSignature =
      JwtCodec.sign(HEADER, CLAIMS, privateKey).split('.').pop() ?? '';
    const headerAndPayload = `${encodeJson(HEADER)}.${encodeJson(CLAIMS)}`;

    it.each([
      ['empty string', ''],
      ['two parts', 'a.b'],
      ['four parts', 'a.b.c.d'],
      [
        'a plus sign in a segment',
        `${encodeJson(HEADER)}+.${encodeJson(CLAIMS)}.${validSignature}`,
      ],
      [
        'header that is not JSON',
        `${encode('not json')}.${encodeJson(CLAIMS)}.${validSignature}`,
      ],
      [
        'payload that is a JSON array',
        `${encodeJson(HEADER)}.${encodeJson([1, 2])}.${validSignature}`,
      ],
      [
        'payload that is null',
        `${encodeJson(HEADER)}.${encodeJson(null)}.${validSignature}`,
      ],
      [
        'signature of 63 bytes',
        `${headerAndPayload}.${Buffer.alloc(63, 1).toString('base64url')}`,
      ],
      [
        'signature with base64 padding',
        `${headerAndPayload}.${validSignature}=`,
      ],
    ])('throws UNAUTHENTICATED for %s', (_name, token) => {
      expect(() => JwtCodec.parse(token)).toThrow(
        expect.objectContaining({
          code: PlatformErrorCode.AuthUnauthenticated,
        }),
      );
    });

    it('throws UNAUTHENTICATED for a DER signature', () => {
      expect(() => JwtCodec.parse(derToken(privateKey))).toThrow(
        expect.objectContaining({
          code: PlatformErrorCode.AuthUnauthenticated,
        }),
      );
    });
  });
});
