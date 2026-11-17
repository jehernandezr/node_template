import type { KeyObject } from 'node:crypto';
import type { SigningKeyState } from './signing-key-state.enum.js';

/** Una clave ES256 de identity con su `kid` y su momento en la rotación. */
export interface SigningKey {
  readonly kid: string;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  readonly state: SigningKeyState;
}
