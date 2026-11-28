import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { SigningKeySetGenerator } from '../domain/signing-key-set-generator.js';
import { SigningKeyState } from '../domain/signing-key-state.enum.js';

/** Generates a P-256 key for ES256 with a random `kid`, in the format `ConfigSigningKeyProvider` reads. */
export class Es256SigningKeySetGenerator extends SigningKeySetGenerator {
  private static readonly KID_BYTES = 8;

  override generate(): string {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    return JSON.stringify([
      {
        ...privateKey.export({ format: 'jwk' }),
        kid: randomBytes(Es256SigningKeySetGenerator.KID_BYTES).toString(
          'base64url',
        ),
        alg: 'ES256',
        use: 'sig',
        status: SigningKeyState.Active,
      },
    ]);
  }
}
