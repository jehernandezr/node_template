import type { KeyObject } from 'node:crypto';
import { JwksKeySource } from '@platform/auth';
import { SigningKeyProvider } from '../domain/signing-key-provider.js';

/** Identity verifica sus propios tokens con sus claves, sin descargar su JWKS por HTTP. */
export class SigningKeyJwksSource extends JwksKeySource {
  constructor(private readonly keys: SigningKeyProvider) {
    super();
  }

  async keyFor(kid: string): Promise<KeyObject | undefined> {
    return this.keys.ring().find(kid)?.publicKey;
  }
}
