import type { Clock } from '@platform/kernel';
import { InternalHeader } from '../transport/internal-header.enum.js';
import { HmacSignatureCalculator } from './hmac-signature-calculator.js';
import { InternalCallSigner } from './internal-call-signer.js';
import type { SignableRequest } from './signable-request.js';

/** Firma las llamadas salientes con HMAC-SHA256 y un secreto compartido entre servicios. */
export class HmacInternalCallSigner extends InternalCallSigner {
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
