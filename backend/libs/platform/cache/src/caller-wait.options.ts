import type { Deadline } from '@platform/primitives';

/** Hasta cuándo puede esperar un llamador. Nunca afecta a otros llamadores. */
export interface CallerWaitOptions {
  /** El llamador deja de esperar y rechaza con el motivo de la señal cuando aborta. */
  readonly signal?: AbortSignal;
  /** El llamador deja de esperar y rechaza con `DeadlineExceededError` al vencer el plazo. */
  readonly deadline?: Deadline;
}
