import type { Clock } from '@platform/kernel';
import { InternalHeader } from '../transport/internal-header.enum.js';
import { HmacSignatureCalculator } from '../auth/hmac-signature-calculator.js';
import type { SignableRequest } from '../auth/signable-request.js';
import { InternalRequestSigner } from './internal-request-signer.js';

/** Signs outgoing calls with HMAC-SHA256 and a secret shared between services. */
export class HmacSigner extends InternalRequestSigner {
  private readonly calculator: HmacSignatureCalculator;

  constructor(
    secret: string,
    private readonly clock: Clock,
  ) {
    super();
    this.calculator = new HmacSignatureCalculator(secret);
  }

  override sign(request: SignableRequest): Promise<Record<string, string>> {
    const timestampMs = this.clock.now().getTime();
    return Promise.resolve({
      [InternalHeader.Timestamp]: String(timestampMs),
      [InternalHeader.Signature]: this.calculator.sign(request, timestampMs),
    });
  }
}
