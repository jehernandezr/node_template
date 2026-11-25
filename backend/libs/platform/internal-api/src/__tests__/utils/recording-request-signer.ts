import type { SignableRequest } from '../../auth/signable-request.js';
import { InternalRequestSigner } from '../../signing/internal-request-signer.js';

/** Test signer: records every request it receives and returns a fixed header. */
export class RecordingRequestSigner extends InternalRequestSigner {
  readonly requests: SignableRequest[] = [];

  sign(request: SignableRequest): Promise<Record<string, string>> {
    this.requests.push(request);
    return Promise.resolve({ 'x-test-signature': 'signed' });
  }
}
