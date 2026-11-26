import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Optional attributes copied to the envelope. */
export interface PublishOptions {
  readonly subject?: string;
  /** W3C `traceparent`. Defaults to the one of the active span. */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Ordering group, usually the aggregate id. It is required when the
   * route points to a FIFO topic or queue (it becomes the SNS and SQS
   * `MessageGroupId`); the outbox also publishes the records of a group in order.
   */
  readonly groupId?: string;
}

/** Options for sending a command. */
export interface SendOptions extends PublishOptions {
  /**
   * Wait before the message is visible to the consumer, up to
   * {@link MAX_SEND_DELAY_MS} (the SQS limit). FIFO queues do not support it.
   */
  readonly delayMs?: number;
}

/**
 * Port that business code uses to emit events and commands. The
 * contracts are the `defineEvent` and `defineCommand` descriptors of
 * `@contracts/platform`, and the destination comes from the topology.
 */
export abstract class MessageBus {
  /**
   * Publishes an event to the topic its route points to.
   * @param event Event contract.
   * @param data Payload.
   * @param options Tenant, group and deduplication.
   * @returns The envelope.
   */
  abstract publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;

  /**
   * Sends a command to the queue its route points to.
   * @param command Command contract.
   * @param data Payload.
   * @param options Tenant, group and deduplication.
   * @returns The envelope.
   */
  abstract send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;
}

/** Maximum wait of `send` (15 minutes, the SQS `DelaySeconds` limit). */
export const MAX_SEND_DELAY_MS = 15 * 60 * 1000;
