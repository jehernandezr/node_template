import { createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { InvalidKeyError } from '../errors/invalid-key.error.js';
import type { PublicJwk } from './public-jwk.js';

/** Converts EC P-256 keys from `node:crypto` to JWK and back. Pure stateless utility. */
export class JwkCodec {
  /** A P-256 coordinate in base64url is 32 bytes, that is 43 characters. */
  private static readonly COORDINATE = /^[A-Za-z0-9_-]{43}$/;

  /**
   * Returns the public JWK of `key` (public or private) with the given `kid`. It never includes `d`.
   * @param key Public or private key.
   * @param kid Key id.
   * @returns The public JWK.
   */
  static toPublicJwk(key: KeyObject, kid: string): PublicJwk {
    const publicKey = key.type === 'private' ? createPublicKey(key) : key;
    const jwk = publicKey.export({ format: 'jwk' });
    if (
      jwk.kty !== 'EC' ||
      jwk.crv !== 'P-256' ||
      typeof jwk.x !== 'string' ||
      typeof jwk.y !== 'string'
    ) {
      throw new InvalidKeyError('not an EC P-256 key');
    }
    if (kid.length === 0) {
      throw new InvalidKeyError('empty kid');
    }
    return {
      kty: 'EC',
      crv: 'P-256',
      x: jwk.x,
      y: jwk.y,
      kid,
      use: 'sig',
      alg: 'ES256',
    };
  }

  /**
   * Returns the public key of a JWK, with `createPublicKey({ key, format: 'jwk' })`.
   * @param jwk JWK to read.
   * @returns The public key.
   * @throws InvalidKeyError if it is not an object with `kty: 'EC'` and `crv: 'P-256'`, or if `x` or `y` are not a valid coordinate.
   */
  static publicKeyFromJwk(jwk: unknown): KeyObject {
    if (!JwkCodec.isRecord(jwk)) {
      throw new InvalidKeyError('not an object');
    }
    if (jwk.kty !== 'EC') {
      throw new InvalidKeyError('unsupported kty');
    }
    if (jwk.crv !== 'P-256') {
      throw new InvalidKeyError('unsupported crv');
    }
    const { x, y } = jwk;
    if (
      typeof x !== 'string' ||
      typeof y !== 'string' ||
      !JwkCodec.COORDINATE.test(x) ||
      !JwkCodec.COORDINATE.test(y)
    ) {
      throw new InvalidKeyError('malformed coordinates');
    }
    if ('d' in jwk) {
      throw new InvalidKeyError('private key material');
    }
    try {
      return createPublicKey({
        key: { kty: 'EC', crv: 'P-256', x, y },
        format: 'jwk',
      });
    } catch (error) {
      throw new InvalidKeyError('invalid coordinates', error);
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
