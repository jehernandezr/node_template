/** Stage of a signing key within its rotation. */
export enum SigningKeyState {
  /** Signs new tokens. There is only one. */
  Active = 'active',
  /** No longer signs (or not yet), but its tokens are still valid: it is published in the JWKS. */
  Verifying = 'verifying',
  /** Compromised or expired: it neither signs nor is published. */
  Retired = 'retired',
}
