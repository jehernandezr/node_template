import type { ServiceContract } from '@contracts/platform';
import {
  topologyFromContracts,
  type MessageDispatcher,
} from '@platform/messaging';
import {
  InMemoryBus,
  type DeadLetterEntry,
} from '@platform/messaging/test-utils';

/** Una cola de la topología y el servicio que la consume. */
interface ConsumedQueue {
  readonly queue: string;
  readonly consumer: string;
}

/**
 * El bus en memoria que une a los cinco servicios en lugar de SNS y SQS: los relays de sus outbox publican en él y
 * cada cola se entrega al despachador del servicio que la declara en su contrato.
 */
export class PlatformBus {
  readonly bus: InMemoryBus;
  private readonly queues: readonly ConsumedQueue[];
  private readonly dispatchers = new Map<string, MessageDispatcher>();

  constructor(contracts: readonly ServiceContract[]) {
    this.bus = new InMemoryBus(topologyFromContracts(contracts), {
      source: 'platform-flow',
    });
    this.queues = contracts.flatMap((contract) =>
      Object.values(contract.queues).map((queue) => ({
        queue: queue.name,
        consumer: contract.service,
      })),
    );
  }

  /** El despachador de un servicio recibe todas las colas que su contrato declara. */
  attach(service: string, dispatcher: MessageDispatcher): void {
    this.dispatchers.set(service, dispatcher);
  }

  /** Entrega una vez lo que está vencido en cada cola y devuelve cuántas entregas hizo. */
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

  /** Sin mensajes en espera, incluidos los que esperan un reintento. */
  isIdle(): boolean {
    return this.queues.every(({ queue }) => this.bus.pendingCount(queue) === 0);
  }

  deadLetters(): readonly DeadLetterEntry[] {
    return this.queues.flatMap(({ queue }) => this.bus.deadLetters(queue));
  }

  private dispatcherOf(service: string): MessageDispatcher {
    const dispatcher = this.dispatchers.get(service);
    if (dispatcher === undefined) {
      throw new Error(`Sin despachador para ${service}`);
    }
    return dispatcher;
  }
}
