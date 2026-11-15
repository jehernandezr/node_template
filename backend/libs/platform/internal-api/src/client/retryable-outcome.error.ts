import type {
  TransientFailureOutcome,
  UncertainOutcome,
} from '@platform/primitives';

/**
 * Control de flujo: un intento que terminó en un resultado no final lo lanza
 * para que el `ResilienceRegistry` lo reintente (`retryable` lo marca como
 * transitorio y `retryAfterMs` es la pista de espera que ya sabe leer). Si no
 * quedan intentos, el `CallErrorTranslator` lo vuelve a convertir en su
 * resultado. Nunca sale del cliente.
 */
export class RetryableOutcomeError extends Error {
  readonly retryable = true;
  readonly retryAfterMs: number | undefined;

  constructor(readonly outcome: TransientFailureOutcome | UncertainOutcome) {
    super(outcome.reason);
    this.name = 'RetryableOutcomeError';
    this.retryAfterMs =
      'retryAfterMs' in outcome ? outcome.retryAfterMs : undefined;
  }
}
