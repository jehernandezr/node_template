import type { TransactionManager } from '@platform/kernel';
import { MessageBus, type PublishOptions } from '../../bus/message-bus.js';
import type {
  CommandDefinition,
  EventDefinition,
  MessageDefinition,
  MessageInput,
  MessageOutput,
} from '../../contracts/message-contract.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import { MessagingError } from '../../errors/messaging-error.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';

/** A message the use case left in the outbox. */
export interface RecordedMessage {
  readonly type: string;
  readonly data: unknown;
  readonly tenantId?: string;
}

/**
 * Bus that stores what was published and, like the real outbox, requires an open transaction and validates the payload
 * against the contract: a use case that publishes outside one or with invalid data fails just as in
 * production.
 */
export class RecordingMessageBus extends MessageBus {
  readonly messages: RecordedMessage[] = [];

  constructor(private readonly transactions: TransactionManager) {
    super();
  }

  types(): string[] {
    return this.messages.map((message) => message.type);
  }

  publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    return this.record(event, data, options);
  }

  send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    return this.record(command, data, options);
  }

  private async record<T>(
    contract: MessageDefinition,
    data: unknown,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<T>> {
    const { type } = contract;
    if (!this.transactions.isInTransaction()) {
      throw new Error(`${type} published outside a transaction`);
    }
    const parsed = contract.schema.safeParse(data);
    if (!parsed.success) {
      throw new MessagingError(
        MessagingErrorCode.InvalidPayload,
        `invalid payload for "${type}": ${parsed.error.message}`,
      );
    }
    this.messages.push({ type, data, tenantId: options?.tenantId });
    return {
      specversion: '1.0',
      id: `${this.messages.length}`,
      type,
      source: 'test',
      time: new Date(0).toISOString(),
      datacontenttype: 'application/json',
      data: data as T,
    };
  }
}
