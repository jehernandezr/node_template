import { timingSafeEqual } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalHeader } from '../transport/internal-header.enum.js';
import { HmacSignatureCalculator } from './hmac-signature-calculator.js';
import { InternalCallAuthenticator } from './internal-call-authenticator.js';
import type { SignableRequest } from './signable-request.js';

/**
 * Authenticates incoming calls signed with `HmacSigner`. The
 * signature is only valid within a time window, on each side of the clock, so
 * that an intercepted call cannot be replayed later.
 */
export class HmacInternalCallAuthenticator extends InternalCallAuthenticator {
  /** Validity window of a signature. */
  static readonly DEFAULT_WINDOW_MS = 60_000;

  private readonly calculator: HmacSignatureCalculator;

  constructor(
    secret: string,
    private readonly clock: Clock,
    private readonly windowMs: number = HmacInternalCallAuthenticator.DEFAULT_WINDOW_MS,
  ) {
    super();
    this.calculator = new HmacSignatureCalculator(secret);
  }

  authenticate(request: SignableRequest): Promise<void> {
    const timestampMs = Number(request.headers[InternalHeader.Timestamp]);
    const signature = request.headers[InternalHeader.Signature];
    if (
      !Number.isFinite(timestampMs) ||
      typeof signature !== 'string' ||
      Math.abs(this.clock.now().getTime() - timestampMs) > this.windowMs
    ) {
      return Promise.reject(HmacInternalCallAuthenticator.rejection());
    }
    const expected = this.expectedSignature(request, timestampMs);
    if (expected === undefined) {
      return Promise.reject(HmacInternalCallAuthenticator.rejection());
    }
    const received = Buffer.from(signature, 'utf8');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return Promise.reject(HmacInternalCallAuthenticator.rejection());
    }
    return Promise.resolve();
  }

  /**
   * Returns the expected signature, or `undefined` if the body is not signable JSON: such a
   * request could not have come from a legitimate signer and is rejected just like
   * an invalid signature, without leaking a different error.
   */
  private expectedSignature(
    request: SignableRequest,
    timestampMs: number,
  ): Buffer | undefined {
    try {
      return Buffer.from(this.calculator.sign(request, timestampMs), 'utf8');
    } catch {
      return undefined;
    }
  }

  /** The message does not tell the reason apart, so it does not help someone probing signatures. */
  private static rejection(): InternalApiError {
    return new InternalApiError(
      InternalApiErrorCode.Unauthenticated,
      'The internal call is not authenticated',
    );
  }
}
