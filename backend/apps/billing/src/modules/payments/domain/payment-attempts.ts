import type { PaymentAttempt } from './payment-attempt.js';
import type { PaymentResult } from './payment-provider.js';

/** Bitácora de intentos de cobro del tenant del `ShardScope` abierto. */
export abstract class PaymentAttempts {
  /**
   * Anota el intento en `Requested`, en su propia transacción, antes de pedir el cobro. Devuelve `false` si ese número
   * de intento ya estaba anotado: otra corrida lo reservó y es la dueña del cobro.
   */
  abstract reserve(attempt: PaymentAttempt): Promise<boolean>;
  abstract find(
    invoiceId: string,
    attempt: number,
  ): Promise<PaymentAttempt | undefined>;
  /** Guarda la respuesta de un intento todavía abierto (`Requested` o `Pending`); uno resuelto no cambia. */
  abstract resolve(id: string, result: PaymentResult): Promise<void>;
}
