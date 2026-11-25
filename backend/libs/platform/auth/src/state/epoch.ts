/**
 * Mass revocation state of a user or a tenant. `revokedBefore` is an
 * epoch in seconds: every token with an earlier `iat` is revoked.
 */
export interface Epoch {
  readonly revokedBefore: number;
  readonly suspended: boolean;
}
