import type { Clock, IdGenerator } from '@platform/kernel';
import {
  InMemoryIdempotencyStore,
  type FinalOutcome,
} from '@platform/primitives';

/**
 * Almacén de idempotencia del router en memoria, para pruebas. Es atómico
 * dentro de un proceso, pero no es un modo de ejecución: un servicio real usa
 * el almacén de `adapters-postgres`. El tipo del resultado es genérico solo
 * para que la prueba de contrato compartida guarde los suyos.
 */
export class InMemoryProcessedOperationStore<
  R = FinalOutcome<unknown>,
> extends InMemoryIdempotencyStore<R> {
  constructor(clock: Clock, ids: IdGenerator) {
    super(clock, ids);
  }
}
