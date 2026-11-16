import { createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { InvalidKeyError } from '../errors/invalid-key.error.js';
import type { PublicJwk } from './public-jwk.js';

/** Convierte claves EC P-256 de `node:crypto` a JWK y de vuelta. Utilidad pura, sin estado. */
export class JwkCodec {
  /** Una coordenada de P-256 en base64url mide 32 bytes, es decir 43 caracteres. */
  private static readonly COORDINATE = /^[A-Za-z0-9_-]{43}$/;

  /** JWK público de `key` (pública o privada) con el `kid` dado. Nunca incluye `d`. */
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
   * Clave pública de un JWK, con `createPublicKey({ key, format: 'jwk' })`.
   * @throws InvalidKeyError si no es un objeto con `kty: 'EC'` y `crv: 'P-256'`, o si `x` o `y` no son una coordenada válida.
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
