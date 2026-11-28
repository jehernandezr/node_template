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
 * that an intercepted call cannot be replayed later. During a rotation it accepts the signature of the current
 * secret and of the previous one, so services deployed one at a time keep calling each other.
 */
export class HmacInternalCallAuthenticator extends InternalCallAuthenticator {
  /** Validity window of a signature. */
  static readonly DEFAULT_WINDOW_MS = 60_000;

  private readonly calculators: readonly HmacSignatureCalculator[];

  /**
   * @param secrets The current secret first and, during a rotation, the previous one; never empty.
   * @throws Error if no secret is given.
   */
  constructor(
    secrets: readonly string[],
    private readonly clock: Clock,
    private readonly windowMs: number = HmacInternalCallAuthenticator.DEFAULT_WINDOW_MS,
  ) {
    super();
    if (secrets.length === 0) {
      throw new Error(
        'HmacInternalCallAuthenticator needs at least one secret',
      );
    }
    this.calculators = secrets.map(
      (secret) => new HmacSignatureCalculator(secret),
    );
  }

  override authenticate(request: SignableRequest): Promise<void> {
    const timestampMs = Number(request.headers[InternalHeader.Timestamp]);
    const signature = request.headers[InternalHeader.Signature];
    if (
      !Number.isFinite(timestampMs) ||
      typeof signature !== 'string' ||
      Math.abs(this.clock.now().getTime() - timestampMs) > this.windowMs
    ) {
      return Promise.reject(HmacInternalCallAuthenticator.rejection());
    }
    const received = Buffer.from(signature, 'utf8');
    const matches = this.calculators.map((calculator) => {
      const expected = this.expectedSignature(calculator, request, timestampMs);
      return (
        expected !== undefined &&
        expected.length === received.length &&
        timingSafeEqual(expected, received)
      );
    });
    return matches.includes(true)
      ? Promise.resolve()
      : Promise.reject(HmacInternalCallAuthenticator.rejection());
  }

  /**
   * Returns the expected signature, or `undefined` if the body is not signable JSON: such a
   * request could not have come from a legitimate signer and is rejected just like
   * an invalid signature, without leaking a different error.
   */
  private expectedSignature(
    calculator: HmacSignatureCalculator,
    request: SignableRequest,
    timestampMs: number,
  ): Buffer | undefined {
    try {
      return Buffer.from(calculator.sign(request, timestampMs), 'utf8');
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
