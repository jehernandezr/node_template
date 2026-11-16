import type { SignableRequest } from './signable-request.js';

/** Puerto que firma una llamada saliente entre servicios. */
export abstract class InternalCallSigner {
  /** Cabeceras que se suman a la llamada para autenticarla. */
  abstract sign(request: SignableRequest): Promise<Record<string, string>>;
}
