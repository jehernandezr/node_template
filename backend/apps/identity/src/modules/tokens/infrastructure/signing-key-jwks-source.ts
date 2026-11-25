import type { KeyObject } from 'node:crypto';
import { JwksKeySource } from '@platform/auth';
import { SigningKeyProvider } from '../domain/signing-key-provider.js';

/** Identity verifies its own tokens with its keys, without downloading its JWKS over HTTP. */
export class SigningKeyJwksSource extends JwksKeySource {
  constructor(private readonly keys: SigningKeyProvider) {
    super();
  }

  async keyFor(kid: string): Promise<KeyObject | undefined> {
    return this.keys.ring().find(kid)?.publicKey;
  }
}
