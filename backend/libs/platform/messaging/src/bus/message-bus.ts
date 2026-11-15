import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Atributos opcionales que se copian al sobre. */
export interface PublishOptions {
  readonly subject?: string;
  /** `traceparent` W3C. Por defecto, el del span activo. */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Grupo de orden, normalmente el id del agregado. Es obligatorio cuando la
   * ruta apunta a un tópico o cola FIFO (se convierte en el `MessageGroupId` de
   * SNS y SQS); el outbox también publica los registros de un grupo en orden.
   */
  readonly groupId?: string;
}

/** Opciones para enviar un comando. */
export interface SendOptions extends PublishOptions {
  /**
   * Espera antes de que el mensaje sea visible para el consumidor, hasta
   * {@link MAX_SEND_DELAY_MS} (el límite de SQS). Las colas FIFO no lo soportan.
   */
  readonly delayMs?: number;
}

/**
 * Puerto que usa el código de negocio para emitir eventos y comandos. Los
 * contratos son los descriptores `defineEvent` y `defineCommand` de
 * `@contracts/platform`, y el destino sale de la topología.
 */
export abstract class MessageBus {
  /** Publica un evento en el tópico al que apunta su ruta. */
  abstract publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;

  /** Envía un comando a la cola a la que apunta su ruta. */
  abstract send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;
}

/** Espera máxima de `send` (15 minutos, el límite `DelaySeconds` de SQS). */
export const MAX_SEND_DELAY_MS = 15 * 60 * 1000;
