import type { SignableRequest } from './signable-request.js';

/** Puerto que autentica una llamada entrante de otro servicio. */
export abstract class InternalCallAuthenticator {
  /**
   * @throws InternalApiError `Unauthenticated` si la llamada no es válida.
   */
  abstract authenticate(request: SignableRequest): Promise<void>;
}
