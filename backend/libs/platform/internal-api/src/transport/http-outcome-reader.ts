import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
  type RetryAfterParser,
} from '@platform/primitives';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalHeader } from './internal-header.enum.js';

/** Convierte la respuesta HTTP de una llamada interna en un `CallOutcome`. */
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
   * - 200 con cuerpo `{ outcome }` cuyo `kind` es un `CallOutcomeKind`: ese `outcome`.
   * - 200 con otro cuerpo, o que no es JSON: `protocol-violation` `invalid-response`.
   * - 401 y 403: `protocol-violation` `unauthenticated` con el código `InternalApiErrorCode.Unauthenticated`.
   * - 408, 425, 429 y 503: `transient-failure` con motivo `http-<estado>` y, si
   *   `Retry-After` se puede leer con `retryAfter.parse`, `retryAfterMs`. El servidor no
   *   empezó el trabajo.
   * - 502 y 504: `uncertain` con motivo `http-<estado>`. Los responde un proxy cuando la
   *   llamada pudo llegar al servidor, así que no se sabe si aplicó sus efectos.
   * - Cualquier otro estado: `protocol-violation` `unexpected-status`, sin código.
   * En las respuestas que no son 200 descarta el cuerpo para liberar la conexión.
   * Nunca lanza.
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
        // Validado el discriminante arriba: el resto de la forma lo cubre cada resultado.
        return outcome as Outcome<unknown>;
      }
    }
    return CallOutcome.protocolViolation(InternalApiReason.InvalidResponse);
  }

  private static async discard(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // El cuerpo de una respuesta que no es 200 no aporta nada; solo se descarta para liberar la conexión.
    }
  }
}
