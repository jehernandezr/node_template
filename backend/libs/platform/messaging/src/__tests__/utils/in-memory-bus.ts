import { type Clock, type IdGenerator, SystemClock } from '@platform/kernel';
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

/** Opciones del bus en memoria. */
export interface InMemoryBusOptions {
  /** Valor del atributo `source` del sobre. */
  readonly source: string;
  /** Reloj de los tiempos del sobre, las esperas y los reintentos. Por defecto, el del sistema. */
  readonly clock?: Clock;
  /** Generador de ids de los sobres. Por defecto, UUIDv7. */
  readonly ids?: IdGenerator;
  /** Fuente del `traceparent` por defecto. Por defecto, el del span activo. */
  readonly traceparent?: () => string | undefined;
}

/** Mensaje que espera en una cola. */
export interface QueuedMessage {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly availableAt: number;
}

/** Mensaje que el dispatcher dio por perdido. */
export interface DeadLetterEntry {
  readonly envelope: MessageEnvelope;
  readonly receiveCount: number;
  readonly error: string;
}

/** Conteos de una pasada de {@link InMemoryBus.drain}. */
export interface DrainReport {
  readonly processed: number;
  readonly duplicates: number;
  readonly ignored: number;
  readonly retried: number;
  readonly deadLettered: number;
  /** Entregas que quedan para reentrega porque otra tiene el claim. */
  readonly inProgress: number;
}

/**
 * Bus en memoria que resuelve las rutas con una topología. Un evento se reparte
 * a cada cola suscrita (filtrando por el `type` del sobre); un comando va a una
 * sola cola.
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
      ...(options.ids ? { ids: options.ids } : {}),
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
   * Entrega una vez cada mensaje vencido de una cola. Los reintentos vuelven a
   * la cola con la espera de su backoff y los descartados quedan en
   * {@link deadLetters}. El consumidor del dispatcher debe ser esta cola.
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

  /** Mensajes que esperan en una cola, incluidos los que tienen una espera futura. */
  pendingCount(queueName: string): number {
    return this.requireQueue(queueName).length;
  }

  /** Mensajes de una cola que fueron a la cola de errores. */
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
