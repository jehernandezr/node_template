import type { SignableRequest } from '../../auth/signable-request.js';
import { InternalRequestSigner } from '../../signing/internal-request-signer.js';

/** Firmador de prueba: guarda cada petición que recibe y devuelve una cabecera fija. */
export class RecordingRequestSigner extends InternalRequestSigner {
  readonly requests: SignableRequest[] = [];

  sign(request: SignableRequest): Promise<Record<string, string>> {
    this.requests.push(request);
    return Promise.resolve({ 'x-test-signature': 'signed' });
  }
}
