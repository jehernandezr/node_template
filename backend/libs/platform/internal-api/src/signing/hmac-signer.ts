import type { Clock } from '@platform/kernel';
import { InternalHeader } from '../transport/internal-header.enum.js';
import { HmacSignatureCalculator } from '../auth/hmac-signature-calculator.js';
import type { SignableRequest } from '../auth/signable-request.js';
import { InternalRequestSigner } from './internal-request-signer.js';

/** Firma las llamadas salientes con HMAC-SHA256 y un secreto compartido entre servicios. */
export class HmacSigner extends InternalRequestSigner {
  private readonly calculator: HmacSignatureCalculator;

  constructor(
    secret: string,
    private readonly clock: Clock,
  ) {
    super();
    this.calculator = new HmacSignatureCalculator(secret);
  }

  sign(request: SignableRequest): Promise<Record<string, string>> {
    const timestampMs = this.clock.now().getTime();
    return Promise.resolve({
      [InternalHeader.Timestamp]: String(timestampMs),
      [InternalHeader.Signature]: this.calculator.sign(request, timestampMs),
    });
  }
}
