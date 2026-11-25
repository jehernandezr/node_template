import type { SigningKeyRing } from './signing-key-ring.js';

/** Where identity's signing keys come from. */
export abstract class SigningKeyProvider {
  abstract ring(): SigningKeyRing;
}
