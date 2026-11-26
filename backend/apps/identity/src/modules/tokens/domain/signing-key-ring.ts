import { SigningKeyState } from './signing-key-state.enum.js';
import type { SigningKey } from './signing-key.js';

/** Current signing keys: signs with the active one and publishes the active one and the verification ones. */
export class SigningKeyRing {
  private readonly activeKey: SigningKey;

  /** @throws Error if there is not exactly one active key or if two keys share a `kid`. */
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

  /**
   * Returns the key that signs new tokens.
   * @returns The active key.
   */
  active(): SigningKey {
    return this.activeKey;
  }

  /**
   * The keys the JWKS publishes: the active one and the verification ones, never the retired ones.
   * @returns The published keys.
   */
  published(): readonly SigningKey[] {
    return this.keys.filter((key) => key.state !== SigningKeyState.Retired);
  }

  /**
   * Finds a key by its `kid`.
   * @param kid Key id.
   * @returns The key, or `undefined`.
   */
  find(kid: string): SigningKey | undefined {
    return this.published().find((key) => key.kid === kid);
  }
}
