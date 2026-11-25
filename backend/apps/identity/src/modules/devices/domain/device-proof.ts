import type { DeviceSignatureFields, IdentityRoute } from '@contracts/identity';

/**
 * What a request without a session presents to prove that it comes from a registered device: the
 * device signature over the route it calls and the request values the signature binds.
 */
export interface DeviceProof {
  readonly action: IdentityRoute;
  readonly signature: DeviceSignatureFields;
  /** Request values that the signature covers after the nonce, in order. */
  readonly bound: readonly string[];
}
