import { generateKeyPairSync } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { JwkCodec } from '../../jwks/jwk-codec.js';
import type { PublicJwk } from '../../jwks/public-jwk.js';
import { StaticJwksKeySource } from '../../jwks/static-jwks-key-source.js';

/** EC P-256 key pair generated for a test, with its `kid`. */
export class TestKeyPair {
  private constructor(
    readonly kid: string,
    readonly privateKey: KeyObject,
    readonly publicKey: KeyObject,
  ) {}

  /** Generates a new pair with `generateKeyPairSync('ec', { namedCurve: 'P-256' })`. */
  static generate(kid: string): TestKeyPair {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    return new TestKeyPair(kid, privateKey, publicKey);
  }

  /** Returns the public JWK of the key, as identity would publish it. */
  jwk(): PublicJwk {
    return JwkCodec.toPublicJwk(this.publicKey, this.kid);
  }

  /** Returns a static source that only knows this key under its `kid`. */
  keySource(): StaticJwksKeySource {
    return new StaticJwksKeySource(new Map([[this.kid, this.publicKey]]));
  }
}
