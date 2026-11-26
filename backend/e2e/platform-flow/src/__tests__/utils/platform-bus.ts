import type { ServiceContract } from '@contracts/platform';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import {
  topologyFromContracts,
  type MessageDispatcher,
} from '@platform/messaging';
import {
  InMemoryBus,
  type DeadLetterEntry,
} from '@platform/messaging/test-utils';

/** A queue of the topology and the service that consumes it. */
interface ConsumedQueue {
  readonly queue: string;
  readonly consumer: string;
}

/**
 * The in-memory bus that joins the five services instead of SNS and SQS: the relays of their outboxes publish to it and
 * each queue is delivered to the dispatcher of the service that declares it in its contract.
 */
export class PlatformBus {
  readonly bus: InMemoryBus;
  private readonly queues: readonly ConsumedQueue[];
  private readonly dispatchers = new Map<string, MessageDispatcher>();

  constructor(contracts: readonly ServiceContract[]) {
    this.bus = new InMemoryBus(topologyFromContracts(contracts), {
      source: 'platform-flow',
      restorer: new TraceContextRestorer(new Tracing(new Redactor())),
    });
    this.queues = contracts.flatMap((contract) =>
      Object.values(contract.queues).map((queue) => ({
        queue: queue.name,
        consumer: contract.service,
      })),
    );
  }

  /** A service's dispatcher receives all the queues its contract declares. */
  attach(service: string, dispatcher: MessageDispatcher): void {
    this.dispatchers.set(service, dispatcher);
  }

  /** Delivers once what is due in each queue and returns how many deliveries it made. */
  async deliverDue(): Promise<number> {
    let delivered = 0;
    for (const { queue, consumer } of this.queues) {
      const report = await this.bus.drain(queue, this.dispatcherOf(consumer));
      delivered +=
        report.processed +
        report.duplicates +
        report.ignored +
        report.retried +
        report.deadLettered +
        report.inProgress;
    }
    return delivered;
  }

  /** No messages waiting, including those waiting for a retry. */
  isIdle(): boolean {
    return this.queues.every(({ queue }) => this.bus.pendingCount(queue) === 0);
  }

  deadLetters(): readonly DeadLetterEntry[] {
    return this.queues.flatMap(({ queue }) => this.bus.deadLetters(queue));
  }

  private dispatcherOf(service: string): MessageDispatcher {
    const dispatcher = this.dispatchers.get(service);
    if (dispatcher === undefined) {
      throw new Error(`No dispatcher for ${service}`);
    }
    return dispatcher;
  }
}
