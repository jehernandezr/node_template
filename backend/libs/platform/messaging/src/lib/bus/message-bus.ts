import type {
  CommandContract,
  EventContract,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Optional attributes copied into the envelope. */
export interface PublishOptions {
  readonly subject?: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
}

/** Options for sending a command. */
export interface SendOptions extends PublishOptions {
  /** Delay before the message becomes visible to the consumer. */
  readonly delayMs?: number;
}

/** Port used by business code to emit events and commands. Routing is resolved from the topology. */
export interface MessageBus {
  /** Publishes an event to the topic its route points to. */
  publish<T>(
    contract: EventContract<T>,
    data: T,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<T>>;
  /** Sends a command to the queue its route points to. */
  send<T>(
    contract: CommandContract<T>,
    data: T,
    options?: SendOptions,
  ): Promise<MessageEnvelope<T>>;
}
