import { generateKeyPairSync } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { JwkCodec } from '../../jwks/jwk-codec.js';
import type { PublicJwk } from '../../jwks/public-jwk.js';
import { StaticJwksKeySource } from '../../jwks/static-jwks-key-source.js';

/** Par de claves EC P-256 generado para una prueba, con su `kid`. */
export class TestKeyPair {
  private constructor(
    readonly kid: string,
    readonly privateKey: KeyObject,
    readonly publicKey: KeyObject,
  ) {}

  /** Genera un par nuevo con `generateKeyPairSync('ec', { namedCurve: 'P-256' })`. */
  static generate(kid: string): TestKeyPair {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    return new TestKeyPair(kid, privateKey, publicKey);
  }

  /** JWK público de la clave, como lo publicaría identity. */
  jwk(): PublicJwk {
    return JwkCodec.toPublicJwk(this.publicKey, this.kid);
  }

  /** Fuente estática que solo conoce esta clave bajo su `kid`. */
  keySource(): StaticJwksKeySource {
    return new StaticJwksKeySource(new Map([[this.kid, this.publicKey]]));
  }
}
