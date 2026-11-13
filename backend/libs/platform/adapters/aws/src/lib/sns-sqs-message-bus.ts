import {
  type CommandDefinition,
  type EnvelopePublisher,
  type EventDefinition,
  type MessageBus,
  type MessageEnvelope,
  type MessageInput,
  type MessageOutput,
  type OutboundMessage,
  OutboundMessageFactory,
  type OutboundMessageFactoryOptions,
  type PublishOptions,
  type SendOptions,
  type Topology,
} from '@platform/messaging';

/** Dependencias de {@link SnsSqsMessageBus}. */
export interface SnsSqsMessageBusOptions extends OutboundMessageFactoryOptions {
  readonly topology: Topology;
  /** Normalmente un `SnsSqsEnvelopePublisher`. */
  readonly publisher: EnvelopePublisher;
}

/**
 * `MessageBus` que publica directo en SNS y SQS, sin outbox. Sirve para
 * mensajes que no acompañan un cambio en la base (un job, una Lambda sin
 * transacción). Cuando el mensaje sale de un caso de uso que escribe datos,
 * usa `OutboxMessageBus` con `SnsSqsEnvelopePublisher` en el relay.
 *
 * Valida ruta, contrato, `groupId` FIFO, retraso y tamaño antes de llamar.
 */
export class SnsSqsMessageBus implements MessageBus {
  private readonly factory: OutboundMessageFactory;
  private readonly publisher: EnvelopePublisher;

  constructor(options: SnsSqsMessageBusOptions) {
    options.topology.assertValid();
    this.factory = new OutboundMessageFactory(options.topology, options);
    this.publisher = options.publisher;
  }

  async publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    return this.deliver(this.factory.event(event, data, options));
  }

  async send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    return this.deliver(this.factory.command(command, data, options));
  }

  private async deliver<T>(
    message: OutboundMessage<T>,
  ): Promise<MessageEnvelope<T>> {
    await this.publisher.publish(message.envelope, message.target, {
      ...(message.groupId === undefined ? {} : { groupId: message.groupId }),
      ...(message.delayMs ? { delayMs: message.delayMs } : {}),
    });
    return message.envelope;
  }
}
