import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Optional attributes copied into the envelope. */
export interface PublishOptions {
  readonly subject?: string;
  /** W3C `traceparent`. Defaults to the active span (`currentTraceparent()`). */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Ordering group, usually the aggregate id. Required when the route targets
   * a FIFO topic or queue (it becomes the SNS/SQS `MessageGroupId`); the outbox
   * also publishes the records of one group in order.
   */
  readonly groupId?: string;
}

/** Options for sending a command. */
export interface SendOptions extends PublishOptions {
  /**
   * Delay before the message becomes visible to the consumer, up to
   * {@link MAX_SEND_DELAY_MS} (the SQS limit). FIFO queues do not support it.
   */
  readonly delayMs?: number;
}

/**
 * Port used by business code to emit events and commands. Contracts are the
 * `defineEvent` and `defineCommand` descriptors of `@contracts/platform`, and
 * routing is resolved from the topology.
 */
export interface MessageBus {
  /** Publishes an event to the topic its route points to. */
  publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;
  /** Sends a command to the queue its route points to. */
  send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>>;
}

/** Longest delay of `send` (15 minutes, the SQS `DelaySeconds` limit). */
export const MAX_SEND_DELAY_MS = 15 * 60 * 1000;
