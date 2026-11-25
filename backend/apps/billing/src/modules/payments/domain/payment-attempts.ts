import type { PaymentAttempt } from './payment-attempt.js';
import type { PaymentResult } from './payment-provider.js';

/** Bitácora de intentos de cobro del tenant del `ShardScope` abierto. */
export abstract class PaymentAttempts {
  /**
   * Anota el intento en `Requested`, en su propia transacción, antes de pedir el cobro.
   * @param attempt Intento a anotar, con su id y su número dentro de la factura.
   * @returns `false` si ese número de intento ya estaba anotado: otra corrida lo reservó y es la dueña del cobro.
   */
  abstract reserve(attempt: PaymentAttempt): Promise<boolean>;

  /**
   * Busca un intento por su número dentro de la factura.
   * @param invoiceId Factura del intento.
   * @param attempt Número del intento, desde 1.
   * @returns El intento, o `undefined` si nunca se anotó.
   */
  abstract find(
    invoiceId: string,
    attempt: number,
  ): Promise<PaymentAttempt | undefined>;

  /**
   * Busca un intento por el id que viajó al proveedor como llave de idempotencia.
   * @param invoiceId Factura a la que debe pertenecer el intento.
   * @param id Id del intento.
   * @returns El intento, o `undefined` si no existe o es de otra factura.
   */
  abstract findById(
    invoiceId: string,
    id: string,
  ): Promise<PaymentAttempt | undefined>;

  /**
   * El intento de número más alto de la factura: el único que puede seguir abierto.
   * @param invoiceId Factura de los intentos.
   * @returns El último intento, o `undefined` si la factura nunca se cobró.
   */
  abstract latest(invoiceId: string): Promise<PaymentAttempt | undefined>;

  /**
   * Guarda la respuesta de un intento todavía abierto (`Requested` o `Pending`); uno resuelto no cambia.
   * @param id Id del intento.
   * @param result Respuesta del proveedor, con su referencia o su motivo.
   */
  abstract resolve(id: string, result: PaymentResult): Promise<void>;
}
