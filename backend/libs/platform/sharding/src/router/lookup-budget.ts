import type { Clock } from '@platform/kernel';
import { Deadline } from '@platform/primitives';

/**
 * Presupuesto de tiempo de una búsqueda: un `Deadline`, un `AbortSignal`, los
 * dos o ninguno. Solo deja de esperar a quien llama; el trabajo compartido con
 * otros llamadores (una carga de vuelo único) sigue corriendo.
 */
export class LookupBudget {
  constructor(
    private readonly clock: Clock,
    private readonly deadline?: Deadline,
    private readonly signal?: AbortSignal,
  ) {}

  /**
   * Lanza si el presupuesto ya se agotó.
   * @throws El `reason` de la señal si abortó; `DeadlineExceededError` si pasó el plazo.
   */
  check(): void {
    this.signal?.throwIfAborted();
    this.deadline?.throwIfExpired();
  }

  /**
   * Espera `promise` hasta que termine o se agote el presupuesto, lo que ocurra primero.
   * @throws El `reason` de la señal si aborta; `DeadlineExceededError` si vence el plazo.
   */
  wait<T>(promise: Promise<T>): Promise<T> {
    if (this.deadline !== undefined) {
      return this.deadline.wait(promise, this.signal);
    }
    if (this.signal !== undefined) {
      // Sin plazo, `Deadline` ya espera la señal; un plazo que nunca vence la deja sola.
      return Deadline.at(Number.MAX_SAFE_INTEGER, this.clock).wait(
        promise,
        this.signal,
      );
    }
    return promise;
  }
}
