import { IdempotencyStore } from '@platform/kernel';

/** Resultado que se guarda cuando un consumidor termina un mensaje. */
export interface ProcessedMessage {
  /** Milisegundos epoch en que terminó el manejador. */
  readonly processedAt: number;
}

/**
 * Puerto de idempotencia de los consumidores: el `IdempotencyStore` de tres
 * estados del kernel, con la llave de {@link ProcessedMessageKey}, más la
 * retención de lo terminado.
 *
 * - `claim` responde `acquired` (con token y lease), `in-progress` (otro reparto
 *   corre el manejador) o `completed`.
 * - El dispatcher pide un lease de al menos el visibility timeout de la cola
 *   (`minLeaseMs`), así un reparto repetido mientras el primero sigue corriendo
 *   encuentra el claim `in-progress` y se deja para reentrega en vez de confirmarse.
 * - `complete` y `release` solo aceptan el token vigente.
 *
 * Un adaptador real debe hacer `complete` en la misma transacción que los
 * efectos del manejador, con el `runInContext` del dispatcher.
 */
export abstract class ProcessedMessageStore extends IdempotencyStore<ProcessedMessage> {
  /** Borra los mensajes terminados antes de `before`. Devuelve cuántos eliminó. */
  abstract purgeCompleted(before: Date): Promise<number>;
}
