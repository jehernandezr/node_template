import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import { RetryPolicy } from './retry-policy.js';
import type { TopicDef } from './topic-def.js';

/** A queue's subscription to a topic. An empty `filterTypes` delivers every type. */
export interface Subscription {
  readonly topic: TopicDef;
  readonly filterTypes: readonly string[];
}

/** Options for {@link QueueDef.subscribesTo}. */
export interface SubscriptionOptions {
  /** Message types to deliver; omitted or empty means every type on the topic. */
  readonly types?: readonly string[];
}

/** Options for {@link QueueDef.deadLetter}. Every queue needs a dead-letter queue. */
export interface DeadLetterOptions {
  /** Receives after which the message moves to the DLQ. Must be >= the retry attempts. */
  readonly maxReceiveCount: number;
  /** 1 to 14. Defaults to 14. */
  readonly retentionDays?: number;
}

/** Resolved dead-letter configuration of a queue. */
export interface DeadLetterConfig {
  readonly maxReceiveCount: number;
  readonly retentionDays: number;
}

const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
const DEFAULT_DLQ_RETENTION_DAYS = 14;

/** Retry policy of queues that do not call `retry()`. */
export const DEFAULT_RETRY_POLICY = RetryPolicy.exponential({
  maxAttempts: 5,
  baseMs: 1_000,
  maxMs: 300_000,
  jitter: true,
});

/** Declares a queue with its subscriptions, retry and dead-letter settings. Fluent. */
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

  /** Subscribes this queue to a topic, optionally only for some message types. */
  subscribesTo(topic: TopicDef, options: SubscriptionOptions = {}): this {
    this.subs.push({ topic, filterTypes: [...(options.types ?? [])] });
    return this;
  }

  /** Sets the retry policy used when handlers fail transiently. */
  retry(policy: RetryPolicy): this {
    this.policy = policy;
    return this;
  }

  /** Configures the dead-letter queue (`<name>-dlq`). */
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

  /** Marks the queue as ordered (FIFO). */
  fifo(): this {
    this.fifoEnabled = true;
    return this;
  }

  /** Sets the visibility timeout in seconds. Range is checked by topology validation. */
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

  get isFifo(): boolean {
    return this.fifoEnabled;
  }

  get visibilityTimeoutSeconds(): number {
    return this.visibilitySeconds;
  }

  /** Explicit policy, or {@link DEFAULT_RETRY_POLICY} when none was set. */
  get retryPolicy(): RetryPolicy {
    return this.policy ?? DEFAULT_RETRY_POLICY;
  }

  /** Dead-letter configuration, or `null` when missing (a validation error). */
  get deadLetterConfig(): DeadLetterConfig | null {
    return this.dlq;
  }

  /** Name of the dead-letter queue, before any `.fifo` suffix handling. */
  get dlqName(): string {
    return `${this.name}-dlq`;
  }

  get subscriptions(): readonly Subscription[] {
    return this.subs;
  }
}
