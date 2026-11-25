import type { KeyObject } from 'node:crypto';
import type { SigningKeyState } from './signing-key-state.enum.js';

/** An identity ES256 key with its `kid` and its stage in the rotation. */
export interface SigningKey {
  readonly kid: string;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  readonly state: SigningKeyState;
}
