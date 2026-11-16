import type { OutboxAppend } from './outbox.js';

/**
 * Lado de escritura del outbox. `append` guarda el registro en la transacción
 * abierta en el contexto asíncrono actual, así se confirma o se deshace con el
 * cambio de negocio. El adaptador encuentra esa transacción con su propio
 * `TransactionManager`. Se usa a través de `OutboxMessageBus`.
 */
export abstract class OutboxWriter {
  abstract append(record: OutboxAppend): Promise<void>;
}
