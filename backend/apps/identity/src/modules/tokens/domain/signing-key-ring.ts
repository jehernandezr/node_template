import { SigningKeyState } from './signing-key-state.enum.js';
import type { SigningKey } from './signing-key.js';

/** Claves de firma vigentes: firma con la activa y publica la activa y las de verificación. */
export class SigningKeyRing {
  private readonly activeKey: SigningKey;

  /** @throws Error si no hay exactamente una clave activa o si dos claves comparten `kid`. */
  constructor(private readonly keys: readonly SigningKey[]) {
    const active = keys.filter((key) => key.state === SigningKeyState.Active);
    if (active.length !== 1 || active[0] === undefined) {
      throw new Error('IDENTITY_SIGNING_KEYS needs exactly one active key');
    }
    if (new Set(keys.map((key) => key.kid)).size !== keys.length) {
      throw new Error('IDENTITY_SIGNING_KEYS repeats a kid');
    }
    this.activeKey = active[0];
  }

  active(): SigningKey {
    return this.activeKey;
  }

  /** Las claves que el JWKS publica: la activa y las de verificación, nunca las retiradas. */
  published(): readonly SigningKey[] {
    return this.keys.filter((key) => key.state !== SigningKeyState.Retired);
  }

  find(kid: string): SigningKey | undefined {
    return this.published().find((key) => key.kid === kid);
  }
}
