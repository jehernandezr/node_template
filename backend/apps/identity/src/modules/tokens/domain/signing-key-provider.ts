import type { SigningKeyRing } from './signing-key-ring.js';

/** Where identity's signing keys come from. */
export abstract class SigningKeyProvider {
  /**
   * Reads the current signing keys.
   * @returns The key ring.
   */
  abstract ring(): SigningKeyRing;
}
