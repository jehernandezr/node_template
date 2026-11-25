import type { SignableRequest } from '../auth/signable-request.js';

/**
 * Port that signs an outgoing service-to-service call. `HmacSigner` and the
 * `SigV4Signer` from `@platform/adapters-aws` implement it; the contract test
 * `runInternalRequestSignerContract` pins what both must guarantee.
 */
export abstract class InternalRequestSigner {
  /**
   * Returns the headers, with lowercase names, added to the call to
   * authenticate it. It does not repeat those in `request.headers`.
   */
  abstract sign(request: SignableRequest): Promise<Record<string, string>>;
}
