import type { SignableRequest } from './signable-request.js';

/** Port that authenticates an incoming call from another service. */
export abstract class InternalCallAuthenticator {
  /**
   * Verifies the signature and freshness of an internal call.
   * @param request Signed request.
   * @throws InternalApiError `Unauthenticated` if the call is not valid.
   */
  abstract authenticate(request: SignableRequest): Promise<void>;
}
