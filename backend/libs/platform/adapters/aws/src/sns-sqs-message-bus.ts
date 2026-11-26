import {
  type CommandDefinition,
  type EnvelopePublisher,
  type EventDefinition,
  MessageBus,
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

/** Dependencies of {@link SnsSqsMessageBus}. */
export interface SnsSqsMessageBusOptions extends OutboundMessageFactoryOptions {
  readonly topology: Topology;
  /** Usually a `SnsSqsEnvelopePublisher`. */
  readonly publisher: EnvelopePublisher;
}

/**
 * `MessageBus` that publishes directly on SNS and SQS, without an outbox. Useful for
 * messages that do not accompany a database change (a job, a Lambda without a
 * transaction). When the message comes from a use case that writes data,
 * the outbox stores the envelope in the same transaction and the relay publishes it
 * with `SnsSqsEnvelopePublisher`.
 *
 * Validates route, contract, FIFO `groupId`, delay and size before calling.
 */
export class SnsSqsMessageBus extends MessageBus {
  private readonly factory: OutboundMessageFactory;
  private readonly publisher: EnvelopePublisher;

  constructor(options: SnsSqsMessageBusOptions) {
    super();
    options.topology.assertValid();
    this.factory = new OutboundMessageFactory(options.topology, options);
    this.publisher = options.publisher;
  }

  override async publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    return this.deliver(this.factory.event(event, data, options));
  }

  override async send<M extends CommandDefinition>(
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
