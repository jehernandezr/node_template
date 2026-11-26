import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
  type RetryAfterParser,
} from '@platform/primitives';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalHeader } from './internal-header.enum.js';

/** Converts the HTTP response of an internal call into a `CallOutcome`. */
export class HttpOutcomeReader {
  private static readonly OK = 200;
  private static readonly TRANSIENT_STATUSES: ReadonlySet<number> = new Set([
    408, 425, 429, 503,
  ]);
  private static readonly UNCERTAIN_STATUSES: ReadonlySet<number> = new Set([
    502, 504,
  ]);
  private static readonly UNAUTHENTICATED_STATUSES: ReadonlySet<number> =
    new Set([401, 403]);
  private static readonly KNOWN_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(CallOutcomeKind),
  );

  constructor(private readonly retryAfter: RetryAfterParser) {}

  /**
   * - 200 with a `{ outcome }` body whose `kind` is a `CallOutcomeKind`: that `outcome`.
   * - 200 with another body, or one that is not JSON: `protocol-violation` `invalid-response`.
   * - 401 and 403: `protocol-violation` `unauthenticated` with the code `InternalApiErrorCode.Unauthenticated`.
   * - 408, 425, 429 and 503: `transient-failure` with reason `http-<status>` and, if
   *   `Retry-After` can be read with `retryAfter.parse`, `retryAfterMs`. The server did not
   *   start the work.
   * - 502 and 504: `uncertain` with reason `http-<status>`. A proxy responds with them when the
   *   call may have reached the server, so it is unknown whether it applied its effects.
   * - Any other status: `protocol-violation` `unexpected-status`, without a code.
   * On non-200 responses it discards the body to free the connection.
   * It never throws.
   * @param response HTTP response.
   * @returns The outcome.
   */
  async read(response: Response): Promise<Outcome<unknown>> {
    if (response.status === HttpOutcomeReader.OK) {
      return this.readBody(response);
    }
    await HttpOutcomeReader.discard(response);
    if (HttpOutcomeReader.UNAUTHENTICATED_STATUSES.has(response.status)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.Unauthenticated,
        InternalApiErrorCode.Unauthenticated,
      );
    }
    if (HttpOutcomeReader.TRANSIENT_STATUSES.has(response.status)) {
      const retryAfterMs = this.retryAfter.parse(
        response.headers.get(InternalHeader.RetryAfter),
      );
      return CallOutcome.transientFailure(
        `http-${response.status}`,
        retryAfterMs === undefined ? {} : { retryAfterMs },
      );
    }
    if (HttpOutcomeReader.UNCERTAIN_STATUSES.has(response.status)) {
      return CallOutcome.uncertain(`http-${response.status}`);
    }
    return CallOutcome.protocolViolation(InternalApiReason.UnexpectedStatus);
  }

  /**
   * The discriminant was validated above: each result covers the rest of the shape.
   */
  private async readBody(response: Response): Promise<Outcome<unknown>> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return CallOutcome.protocolViolation(InternalApiReason.InvalidResponse);
    }
    if (typeof body === 'object' && body !== null && 'outcome' in body) {
      const outcome: unknown = body.outcome;
      if (
        typeof outcome === 'object' &&
        outcome !== null &&
        'kind' in outcome &&
        HttpOutcomeReader.KNOWN_KINDS.has(outcome.kind)
      ) {
        return outcome as Outcome<unknown>;
      }
    }
    return CallOutcome.protocolViolation(InternalApiReason.InvalidResponse);
  }

  /**
   * The body of a non-200 response adds nothing; it is only discarded to free the connection.
   */
  private static async discard(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {}
  }
}
