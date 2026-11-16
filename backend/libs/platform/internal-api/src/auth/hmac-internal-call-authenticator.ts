import { timingSafeEqual } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalHeader } from '../transport/internal-header.enum.js';
import { HmacSignatureCalculator } from './hmac-signature-calculator.js';
import { InternalCallAuthenticator } from './internal-call-authenticator.js';
import type { SignableRequest } from './signable-request.js';

/**
 * Autentica las llamadas entrantes firmadas con `HmacSigner`. La
 * firma solo vale dentro de una ventana de tiempo, a cada lado del reloj, para
 * que una llamada interceptada no se repita más tarde.
 */
export class HmacInternalCallAuthenticator extends InternalCallAuthenticator {
  /** Ventana de validez de una firma. */
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
   * Firma esperada, o `undefined` si el cuerpo no es JSON firmable: una
   * petición así no pudo salir de un firmador legítimo y se rechaza igual que
   * una firma inválida, sin dejar escapar otro error.
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

  /** El mensaje no distingue el motivo, para no ayudar a quien prueba firmas. */
  private static rejection(): InternalApiError {
    return new InternalApiError(
      InternalApiErrorCode.Unauthenticated,
      'The internal call is not authenticated',
    );
  }
}
