import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';
import { SigningKeyProvider } from '../domain/signing-key-provider.js';
import { SigningKeyRing } from '../domain/signing-key-ring.js';
import { SigningKeyState } from '../domain/signing-key-state.enum.js';
import type { SigningKey } from '../domain/signing-key.js';

const PrivateJwkSchema = z.looseObject({
  kty: z.literal('EC'),
  crv: z.literal('P-256'),
  kid: z.string().min(1).max(128),
  d: z.string().min(1),
  x: z.string().min(1),
  y: z.string().min(1),
  status: z.enum(SigningKeyState).optional(),
});

/**
 * Reads `IDENTITY_SIGNING_KEYS`: a JSON array of P-256 private JWKs with `kid` and an optional `status`. Without
 * `status`, the first key is the active one and the rest are kept for verification, so a new key enters
 * behind the current one and becomes active on the next deployment.
 */
export class ConfigSigningKeyProvider extends SigningKeyProvider {
  private readonly keys: SigningKeyRing;

  /** @throws Error if the text is not an array of P-256 private JWKs or does not leave exactly one active key. */
  constructor(raw: string) {
    super();
    const parsed = z.array(PrivateJwkSchema).min(1).parse(JSON.parse(raw));
    this.keys = new SigningKeyRing(
      parsed.map((jwk, index): SigningKey => {
        const privateKey = createPrivateKey({
          key: { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y },
          format: 'jwk',
        });
        return {
          kid: jwk.kid,
          privateKey,
          publicKey: createPublicKey(privateKey),
          state:
            jwk.status ??
            (index === 0 ? SigningKeyState.Active : SigningKeyState.Verifying),
        };
      }),
    );
  }

  ring(): SigningKeyRing {
    return this.keys;
  }
}
