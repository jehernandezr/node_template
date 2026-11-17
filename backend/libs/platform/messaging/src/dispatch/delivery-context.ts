import type { MessageEnvelope } from '../envelope/message-envelope.js';

/**
 * Abre el contexto en el que corre una entrega: el claim de idempotencia, el manejador y el `complete`. Un
 * servicio con shards lo usa para fijar el shard y el tenant del sobre, porque el claim vive en la base del
 * tenant y fuera de un contexto no sabría a qué shard ir.
 */
export abstract class DeliveryContext {
  abstract run(
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void>;
}
