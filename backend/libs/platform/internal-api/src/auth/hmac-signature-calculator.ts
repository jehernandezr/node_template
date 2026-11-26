import { createHmac } from 'node:crypto';
import { CanonicalJson } from '@platform/primitives';
import { InternalHeader } from '../transport/internal-header.enum.js';
import type { SignableRequest } from './signable-request.js';

/**
 * Computes the HMAC-SHA256 signature of a call. The signer and the authenticator
 * share it so they cannot diverge.
 *
 * The signed text joins, separated by newlines: method, path, instant,
 * body hash and the headers that change the meaning of the call
 * (tenant, actor, idempotency key, deadline and trace). A missing header
 * counts as empty text.
 */
export class HmacSignatureCalculator {
  private static readonly SIGNED_HEADERS: readonly InternalHeader[] = [
    InternalHeader.TenantId,
    InternalHeader.ActorId,
    InternalHeader.IdempotencyKey,
    InternalHeader.Deadline,
    InternalHeader.Traceparent,
  ];

  constructor(private readonly secret: string) {}

  /**
   * Returns the hexadecimal signature of `request` for the instant `timestampMs`.
   * @param request Method, path, body and headers to sign.
   * @param timestampMs Instant of the signature.
   * @returns The signature.
   */
  sign(request: SignableRequest, timestampMs: number): string {
    return createHmac('sha256', this.secret)
      .update(this.signedText(request, timestampMs))
      .digest('hex');
  }

  private signedText(request: SignableRequest, timestampMs: number): string {
    return [
      request.method,
      request.path,
      String(timestampMs),
      CanonicalJson.digest(request.body),
      ...HmacSignatureCalculator.SIGNED_HEADERS.map(
        (name) => request.headers[name] ?? '',
      ),
    ].join('\n');
  }
}
