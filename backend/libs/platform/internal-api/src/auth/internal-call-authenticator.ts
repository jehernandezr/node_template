import type { SignableRequest } from './signable-request.js';

/** Port that authenticates an incoming call from another service. */
export abstract class InternalCallAuthenticator {
  /**
   * @throws InternalApiError `Unauthenticated` if the call is not valid.
   */
  abstract authenticate(request: SignableRequest): Promise<void>;
}
