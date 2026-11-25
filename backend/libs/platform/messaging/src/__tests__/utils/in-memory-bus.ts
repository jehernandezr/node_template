import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
  SystemRandomSource,
} from '@platform/kernel';
import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../../contracts/message-contract.js';
import type { MessageDispatcher } from '../../dispatch/message-dispatcher.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import { MessagingError } from '../../errors/messaging-error.js';
import type { Topology } from '../../topology/topology.js';
import type {
  MessageBus,
  PublishOptions,
  SendOptions,
} from '../../bus/message-bus.js';
import { OutboundMessageFactory } from '../../bus/outbound-message.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { DispatchOutcome } from '../../dispatch/dispatch-outcome.enum.js';
import type { OutboundTarget } from '../../outbox/outbox.js';
import { TargetKind } from '../../topology/target-kind.enum.js';

/** Options of the in-memory bus. */
export interface InMemoryBusOptions {
  /** Value of the envelope `source` attribute. */
  readonly source: string;
  /** Clock for the envelope times, the waits and the retries. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Envelope id generator. Defaults to UUIDv7. */
  readonly ids?: IdGenerator;
  /** Source of the default `traceparent`. Defaults to the one of the active span. */
  readonly traceparent?: () => string | undefined;
}

/** Message waiting in a queue. */
export interface QueuedMessage {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly availableAt: number;
}

/** Message the dispatcher gave up on. */
export interface DeadLetterEntry {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly error: string;
}

/** Counts of one pass of {@link InMemoryBus.drain}. */
export interface DrainReport {
  readonly processed: number;
  readonly duplicates: number;
  readonly ignored: number;
  readonly retried: number;
  readonly deadLettered: number;
  /** Deliveries left for redelivery because another one holds the claim. */
  readonly inProgress: number;
}

/**
 * In-memory bus that resolves routes with a topology. An event is fanned out
 * to each subscribed queue (filtering by the envelope `type`); a command goes to a
 * single queue.
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
    this.clockSource = options.clock ?? new SystemClock();
    this.factory = new OutboundMessageFactory(topology, {
      source: options.source,
      clock: this.clockSource,
      ids:
        options.ids ??
        new UuidV7IdGenerator(this.clockSource, new SystemRandomSource()),
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
    this.fanOut(route.target.name, envelope);
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
   * Enqueues an already built envelope, as an outbox relay delivers it: an event goes to each queue subscribed to its
   * topic and a command to its queue, visible after `delayMs`.
   */
  accept(envelope: MessageEnvelope, target: OutboundTarget, delayMs = 0): void {
    if (target.kind === TargetKind.Topic) {
      this.fanOut(target.name, envelope);
      return;
    }
    this.push(target.name, {
      envelope,
      receiveCount: 0,
      availableAt: this.clock() + delayMs,
    });
  }

  /**
   * Delivers each due message of a queue once. Retries go back to
   * the queue with their backoff wait and discarded ones end up in
   * {@link deadLetters}. The dispatcher consumer must be this queue.
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

  /** Messages waiting in a queue, including those with a future wait. */
  pendingCount(queueName: string): number {
    return this.requireQueue(queueName).length;
  }

  /** Messages of a queue that went to the dead-letter queue. */
  deadLetters(queueName: string): readonly DeadLetterEntry[] {
    this.requireQueue(queueName);
    return [...(this.deadLetterQueues.get(queueName) ?? [])];
  }

  private fanOut(topicName: string, envelope: MessageEnvelope): void {
    const now = this.clock();
    for (const queue of this.topology.queues) {
      const subscribed = queue.subscriptions.some(
        (subscription) =>
          subscription.topic.name === topicName &&
          (subscription.filterTypes.length === 0 ||
            subscription.filterTypes.includes(envelope.type)),
      );
      if (subscribed)
        this.push(queue.name, { envelope, receiveCount: 0, availableAt: now });
    }
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
