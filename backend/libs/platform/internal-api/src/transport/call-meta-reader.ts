import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from './call-meta.js';
import { InternalHeader } from './internal-header.enum.js';

/** Reads from the HTTP headers of an incoming call the `CallMeta` that the server hands to the router. */
export class CallMetaReader {
  /**
   * Returns the headers with lowercase names and a single value per header: from an
   * array it takes the first and discards anything that is not text.
   * @param raw Raw headers.
   * @returns The normalized headers.
   */
  normalize(
    raw: Readonly<Record<string, string | string[] | undefined>>,
  ): Record<string, string | undefined> {
    const normalized: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(raw)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (typeof single === 'string') {
        normalized[name.toLowerCase()] = single;
      }
    }
    return normalized;
  }

  /**
   * Reads `idempotencyKey` from `x-idempotency-key` (required), `deadline` from `x-call-deadline` and
   * `timeoutMs` from `x-call-timeout-ms` (finite numbers, required), and `traceparent`,
   * `tenantId` and `actorId` if present. It does not set `signal`.
   * @param headers Normalized headers.
   * @returns The call metadata.
   * @throws InternalApiError `InvalidRequest` if a required header is missing or a number is not finite.
   */
  read(headers: Readonly<Record<string, string | undefined>>): CallMeta {
    const traceparent = headers[InternalHeader.Traceparent];
    const tenantId = headers[InternalHeader.TenantId];
    const actorId = headers[InternalHeader.ActorId];
    return {
      idempotencyKey: CallMetaReader.required(
        headers,
        InternalHeader.IdempotencyKey,
      ),
      deadline: CallMetaReader.finite(headers, InternalHeader.Deadline),
      timeoutMs: CallMetaReader.finite(headers, InternalHeader.TimeoutMs),
      ...(traceparent !== undefined && { traceparent }),
      ...(tenantId !== undefined && { tenantId }),
      ...(actorId !== undefined && { actorId }),
    };
  }

  private static required(
    headers: Readonly<Record<string, string | undefined>>,
    name: InternalHeader,
  ): string {
    const value = headers[name];
    if (value === undefined || value.trim() === '') {
      throw CallMetaReader.malformed();
    }
    return value;
  }

  private static finite(
    headers: Readonly<Record<string, string | undefined>>,
    name: InternalHeader,
  ): number {
    const value = Number(CallMetaReader.required(headers, name));
    if (!Number.isFinite(value)) {
      throw CallMetaReader.malformed();
    }
    return value;
  }

  /** The message does not say which header is missing or which value arrived. */
  private static malformed(): InternalApiError {
    return new InternalApiError(
      InternalApiErrorCode.InvalidRequest,
      'The internal call headers are malformed',
    );
  }
}
