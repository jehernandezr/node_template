import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { MessagingError } from '../errors/messaging-error.js';
import type { TopicDef } from './topic-def.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';

/** Subscription of a queue to a topic. An empty type list delivers all types. */
export interface Subscription {
  readonly topic: TopicDef;
  readonly filterTypes: readonly string[];
}

/** Options of {@link QueueDef.subscribesTo}. */
export interface SubscriptionOptions {
  /** Message types to deliver; if omitted or empty, all of the topic's types are included. */
  readonly types?: readonly string[];
}

/** Options of {@link QueueDef.deadLetter}. Every queue needs its dead-letter queue. */
export interface DeadLetterOptions {
  /** Receives after which the message moves to the dead-letter queue. Must be at least the retry attempts. */
  readonly maxReceiveCount: number;
  /** Between 1 and 14. Defaults to 14. */
  readonly retentionDays?: number;
}

/** Resolved dead-letter queue configuration of a queue. */
export interface DeadLetterConfig {
  readonly maxReceiveCount: number;
  readonly retentionDays: number;
}

const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
const DEFAULT_DLQ_RETENTION_DAYS = 14;

/** Retry policy of the queues that do not call `retry()`. */
export const DEFAULT_RETRY_POLICY = new RetryPolicy(
  5,
  1_000,
  300_000,
  BackoffStrategy.FullJitter,
);

/** Declares a queue with its subscriptions, retries and dead-letter queue. Fluent API. */
export class QueueDef {
  readonly name: string;

  private fifoEnabled = false;
  private visibilitySeconds = DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
  private policy: RetryPolicy | null = null;
  private dlq: DeadLetterConfig | null = null;
  private readonly subs: Subscription[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Subscribes the queue to a topic, optionally only for some message types.
   * @param topic Topic to subscribe to.
   * @param options Message types to filter.
   * @returns The queue.
   */
  subscribesTo(topic: TopicDef, options: SubscriptionOptions = {}): this {
    this.subs.push({ topic, filterTypes: [...(options.types ?? [])] });
    return this;
  }

  /**
   * Sets the retry policy used when a handler fails transiently.
   * @param policy Retry policy.
   * @returns The queue.
   */
  retry(policy: RetryPolicy): this {
    this.policy = policy;
    return this;
  }

  /**
   * Configures the dead-letter queue (`<name>-dlq`).
   * @param options Dead-letter settings.
   * @returns The queue.
   */
  deadLetter(options: DeadLetterOptions): this {
    if (
      !Number.isInteger(options.maxReceiveCount) ||
      options.maxReceiveCount < 1
    ) {
      throw new MessagingError(
        MessagingErrorCode.InvalidTopology,
        `queue "${this.name}": maxReceiveCount must be an integer >= 1`,
      );
    }
    this.dlq = {
      maxReceiveCount: options.maxReceiveCount,
      retentionDays: options.retentionDays ?? DEFAULT_DLQ_RETENTION_DAYS,
    };
    return this;
  }

  /**
   * Marks the queue as ordered (FIFO).
   * @returns The queue.
   */
  fifo(): this {
    this.fifoEnabled = true;
    return this;
  }

  /**
   * Sets the visibility timeout in seconds. The range is checked by the topology validation.
   * @param seconds Visibility timeout.
   * @returns The queue.
   */
  visibilityTimeout(seconds: number): this {
    if (!(seconds > 0) || !Number.isFinite(seconds)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidTopology,
        `queue "${this.name}": visibility timeout must be > 0 seconds`,
      );
    }
    this.visibilitySeconds = seconds;
    return this;
  }

  /** Whether the queue is FIFO. */
  get isFifo(): boolean {
    return this.fifoEnabled;
  }

  /** Seconds a received message stays hidden from other consumers before SQS delivers it again. */
  get visibilityTimeoutSeconds(): number {
    return this.visibilitySeconds;
  }

  /** Explicit policy, or {@link DEFAULT_RETRY_POLICY} if none was set. */
  get retryPolicy(): RetryPolicy {
    return this.policy ?? DEFAULT_RETRY_POLICY;
  }

  /** Dead-letter queue configuration, or `null` if missing (validation error). */
  get deadLetterConfig(): DeadLetterConfig | null {
    return this.dlq;
  }

  /** Name of the dead-letter queue, before handling the `.fifo` suffix. */
  get dlqName(): string {
    return `${this.name}-dlq`;
  }

  /** Topics the queue subscribes to. */
  get subscriptions(): readonly Subscription[] {
    return this.subs;
  }
}
