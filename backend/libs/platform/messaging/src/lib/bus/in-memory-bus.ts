import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { DispatchOutcome } from '../dispatch/message-dispatcher.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import type { Topology } from '../topology/topology.js';
import type { MessageBus, PublishOptions, SendOptions } from './message-bus.js';
import { OutboundMessageFactory } from './outbound-message.js';

/** Options of the in-memory bus. */
export interface InMemoryBusOptions {
  /** Value of the envelope `source` attribute. */
  readonly source: string;
  /** Clock used for envelope times, delays and retries. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Id generator for envelopes. Defaults to UUIDv7. */
  readonly ids?: IdGenerator;
  /** @deprecated Use `clock`. Takes precedence over `clock` when given. */
  readonly now?: () => Date;
  /** @deprecated Use `ids`. Takes precedence over `ids` when given. */
  readonly newId?: () => string;
  /** Source of the default `traceparent`. Defaults to `currentTraceparent()`. */
  readonly traceparent?: () => string | undefined;
}

/** A message waiting in a queue. */
export interface QueuedMessage {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly availableAt: number;
}

/** A message that the dispatcher gave up on. */
export interface DeadLetterEntry {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly error: string;
}

/** Counts of one {@link InMemoryBus.drain} pass. */
export interface DrainReport {
  readonly processed: number;
  readonly duplicates: number;
  readonly ignored: number;
  readonly retried: number;
  readonly deadLettered: number;
  /** Deliveries left for redelivery because another delivery holds the claim. */
  readonly inProgress: number;
}

/**
 * In-memory bus that resolves routes from a topology. Events fan out to every
 * subscribed queue (filtering on the envelope `type`); commands go to one queue.
 */
export class InMemoryBus implements MessageBus {
  private readonly topology: Topology;
  private readonly queues = new Map<string, QueuedMessage[]>();
  private readonly deadLetterQueues = new Map<string, DeadLetterEntry[]>();
  private readonly clockSource: Clock;
  private readonly factory: OutboundMessageFactory;

  constructor(topology: Topology, options: InMemoryBusOptions) {
    topology.assertValid();
    this.topology = topology;
    const now = options.now;
    this.clockSource = now ? { now } : (options.clock ?? new SystemClock());
    const ids = options.ids ?? new UuidV7IdGenerator();
    this.factory = new OutboundMessageFactory(topology, {
      source: options.source,
      clock: this.clockSource,
      newId: options.newId ?? (() => ids.next().toString()),
      ...(options.traceparent ? { traceparent: options.traceparent } : {}),
    });
    for (const queue of topology.queues) {
      this.queues.set(queue.name, []);
      this.deadLetterQueues.set(queue.name, []);
    }
  }

  async publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options: PublishOptions = {},
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    const { envelope, route } = this.factory.event(event, data, options);
    const now = this.clock();

    for (const queue of this.topology.queues) {
      const subscribed = queue.subscriptions.some(
        (subscription) =>
          subscription.topic.name === route.target.name &&
          (subscription.filterTypes.length === 0 ||
            subscription.filterTypes.includes(event.type)),
      );
      if (subscribed)
        this.push(queue.name, { envelope, receiveCount: 0, availableAt: now });
    }
    return envelope;
  }

  async send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options: SendOptions = {},
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    const { envelope, route, delayMs } = this.factory.command(
      command,
      data,
      options,
    );
    this.push(route.target.name, {
      envelope,
      receiveCount: 0,
      availableAt: this.clock() + (delayMs ?? 0),
    });
    return envelope;
  }

  /**
   * Delivers every message due in a queue, once. Retries are re-queued with their backoff
   * delay; dead letters are kept in {@link deadLetters}. The dispatcher's consumer should be this queue.
   */
  async drain(
    queueName: string,
    dispatcher: MessageDispatcher,
  ): Promise<DrainReport> {
    const queue = this.requireQueue(queueName);
    const queueDef = this.topology.queues.find((q) => q.name === queueName);
    const policy = queueDef?.retryPolicy;
    const visibilityTimeoutMs =
      queueDef === undefined
        ? undefined
        : queueDef.visibilityTimeoutSeconds * 1000;
    const now = this.clock();

    const due = queue.filter((message) => message.availableAt <= now);
    this.queues.set(
      queueName,
      queue.filter((message) => message.availableAt > now),
    );

    const report = {
      processed: 0,
      duplicates: 0,
      ignored: 0,
      retried: 0,
      deadLettered: 0,
      inProgress: 0,
    };

    for (const message of due) {
      const receiveCount = message.receiveCount + 1;
      const result = await dispatcher.dispatch(message.envelope, {
        receiveCount,
        retryPolicy: policy,
        ...(visibilityTimeoutMs === undefined ? {} : { visibilityTimeoutMs }),
      });
      switch (result.outcome) {
        case DispatchOutcome.Processed:
          report.processed++;
          break;
        case DispatchOutcome.Duplicate:
          report.duplicates++;
          break;
        case DispatchOutcome.Ignored:
          report.ignored++;
          break;
        case DispatchOutcome.RetryLater:
          report.retried++;
          this.push(queueName, {
            envelope: message.envelope,
            receiveCount,
            availableAt: now + result.delayMs,
          });
          break;
        case DispatchOutcome.InProgress:
          report.inProgress++;
          this.push(queueName, {
            envelope: message.envelope,
            receiveCount,
            availableAt: now + result.delayMs,
          });
          break;
        case DispatchOutcome.DeadLetter:
          report.deadLettered++;
          this.deadLetterQueues.get(queueName)?.push({
            envelope: message.envelope,
            receiveCount,
            error: result.error,
          });
          break;
      }
    }

    return report;
  }

  /** Messages waiting in a queue, including ones with a future delay. */
  pendingCount(queueName: string): number {
    return this.requireQueue(queueName).length;
  }

  /** Dead-lettered messages of a queue. */
  deadLetters(queueName: string): readonly DeadLetterEntry[] {
    this.requireQueue(queueName);
    return [...(this.deadLetterQueues.get(queueName) ?? [])];
  }

  private clock(): number {
    return this.clockSource.now().getTime();
  }

  private push(queueName: string, message: QueuedMessage): void {
    this.requireQueue(queueName).push(message);
  }

  private requireQueue(queueName: string): QueuedMessage[] {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new MessagingError(
        MessagingErrorCode.UnknownQueue,
        `unknown queue "${queueName}"`,
      );
    }
    return queue;
  }
}
