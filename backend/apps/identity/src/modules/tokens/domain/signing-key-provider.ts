import type { SigningKeyRing } from './signing-key-ring.js';

/** De dónde salen las claves de firma de identity. */
export abstract class SigningKeyProvider {
  abstract ring(): SigningKeyRing;
}
