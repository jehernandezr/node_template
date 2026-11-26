import {
  MessageBus,
  type CommandDefinition,
  type EventDefinition,
  type MessageEnvelope,
  type MessageInput,
  type MessageOutput,
  type PublishOptions,
} from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';

/** A message a use case handed to the bus. */
export interface RecordedMessage {
  readonly type: string;
  readonly data: unknown;
  readonly tenantId?: string;
}

/** `MessageBus` that records every event and command instead of writing them to an outbox. */
export class RecordingMessageBus extends MessageBus {
  readonly published: RecordedMessage[] = [];
  readonly sent: RecordedMessage[] = [];

  /**
   * Records an event.
   * @param event Event definition.
   * @param data Payload.
   * @param options Envelope options.
   * @returns The envelope of the event.
   */
  override async publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options: PublishOptions = {},
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    this.published.push(RecordingMessageBus.record(event.type, data, options));
    return RecordingMessageBus.envelope(event.type, data);
  }

  /**
   * Records a command.
   * @param command Command definition.
   * @param data Payload.
   * @param options Envelope options.
   * @returns The envelope of the command.
   */
  override async send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options: PublishOptions = {},
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    this.sent.push(RecordingMessageBus.record(command.type, data, options));
    return RecordingMessageBus.envelope(command.type, data);
  }

  private static record(
    type: string,
    data: unknown,
    options: PublishOptions,
  ): RecordedMessage {
    return {
      type,
      data,
      ...(options.tenantId === undefined ? {} : { tenantId: options.tenantId }),
    };
  }

  private static envelope<T>(type: string, data: unknown): MessageEnvelope<T> {
    return EnvelopeBuilder.anEnvelope<T>({ type, data: data as T });
  }
}
