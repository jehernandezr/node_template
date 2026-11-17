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
 * Lee `IDENTITY_SIGNING_KEYS`: un arreglo JSON de JWK privados P-256 con `kid` y un `status` opcional. Sin
 * `status`, la primera clave es la activa y las demás quedan para verificar, así una clave nueva entra
 * detrás de la vigente y pasa a activa en el siguiente despliegue.
 */
export class ConfigSigningKeyProvider extends SigningKeyProvider {
  private readonly keys: SigningKeyRing;

  /** @throws Error si el texto no es un arreglo de JWK privados P-256 o no deja una sola clave activa. */
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
