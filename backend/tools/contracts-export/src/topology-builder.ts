import {
  DEAD_LETTER_SUFFIX,
  MessageKind,
  type CommandDefinition,
  type QueueDefinition,
  type ServiceContract,
  type TopicDefinition,
} from '@contracts/platform';
import { TOPOLOGY_FORMAT_VERSION } from './export-constants.js';
import { ExportError } from './export-error.js';
import type { GlobalUniquenessChecker } from './global-uniqueness-checker.js';
import type { JsonObject } from './json.type.js';

const SECONDS_PER_DAY = 86_400;

/** Tipo de destino de una ruta; coincide con `TargetKind` de `@platform/messaging`. */
enum TargetKind {
  Topic = 'topic',
  Queue = 'queue',
}

interface Owned<T> {
  readonly service: string;
  readonly value: T;
}

/** Índices globales: qué servicio declara cada tópico, cola y comando. */
interface ContractIndex {
  readonly topics: Map<TopicDefinition, Owned<TopicDefinition>>;
  readonly queues: Owned<QueueDefinition>[];
  readonly commands: Map<CommandDefinition, string>;
}

/**
 * Construye la topología de mensajería desde los contratos: tópicos con sus
 * productores, colas con su consumidor, suscripciones con filtros por tipo y
 * la ruta de cada evento y comando. Es la entrada del módulo `messaging` de
 * Terraform y del script de LocalStack.
 */
export class TopologyBuilder {
  constructor(private readonly uniqueness: GlobalUniquenessChecker) {}

  /**
   * El formato extiende el de `Topology.toJSON()` de `@platform/messaging` con
   * `owner`, `producers`, `consumer` y `retry`, para derivar permisos IAM.
   */
  build(contracts: readonly ServiceContract[]): JsonObject {
    this.uniqueness.check(contracts);
    const index = this.indexContracts(contracts);
    const senders = this.sendersOf(contracts, index);
    const topics = [...index.topics.values()]
      .sort((a, b) => this.byName(a.value, b.value))
      .map((owned) => this.topicOf(owned));
    const queues = [...index.queues]
      .sort((a, b) => this.byName(a.value, b.value))
      .map((owned) => this.queueOf(owned, index, senders));
    return {
      $comment:
        'GENERADO por backend/tools/contracts-export desde los contratos. No editar: ejecuta pnpm nx run contracts-export:topology-export.',
      formatVersion: TOPOLOGY_FORMAT_VERSION,
      topics,
      queues,
      routes: this.routesOf(index),
    };
  }

  /** Ruta de cada evento a su tópico y de cada comando a su cola, por tipo. */
  private routesOf(index: ContractIndex): JsonObject[] {
    const toTopics = [...index.topics.values()].flatMap(
      ({ service, value: topic }) =>
        topic.events.map((event) => ({
          type: event.type,
          kind: MessageKind.Event,
          target: topic.name,
          targetKind: TargetKind.Topic,
          owner: service,
        })),
    );
    const toQueues = index.queues.flatMap(({ service, value: queue }) =>
      queue.commands.map((command) => ({
        type: command.type,
        kind: MessageKind.Command,
        target: queue.name,
        targetKind: TargetKind.Queue,
        owner: service,
      })),
    );
    return [...toTopics, ...toQueues].sort((a, b) =>
      this.compare(a.type, b.type),
    );
  }

  /** Servicios que envían cada comando; enviar uno que nadie declara es un error. */
  private sendersOf(
    contracts: readonly ServiceContract[],
    index: ContractIndex,
  ): Map<CommandDefinition, Set<string>> {
    const senders = new Map<CommandDefinition, Set<string>>();
    for (const contract of contracts) {
      for (const command of contract.sends) {
        if (!index.commands.has(command)) {
          throw ExportError.forTopology(
            `${contract.service} envía ${command.type}, que ningún contrato declara`,
          );
        }
        const set = senders.get(command) ?? new Set<string>();
        set.add(contract.service);
        senders.set(command, set);
      }
    }
    return senders;
  }

  private topicOf({
    service,
    value: topic,
  }: Owned<TopicDefinition>): JsonObject {
    return {
      name: topic.name,
      fifo: topic.fifo,
      owner: service,
      producers: [service],
      description: topic.description,
    };
  }

  /** Los productores de la cola son los servicios que envían alguno de sus comandos. */
  private queueOf(
    { service, value: queue }: Owned<QueueDefinition>,
    index: ContractIndex,
    senders: ReadonlyMap<CommandDefinition, ReadonlySet<string>>,
  ): JsonObject {
    const producers = queue.commands.flatMap((command) => [
      ...(senders.get(command) ?? []),
    ]);
    return {
      name: queue.name,
      fifo: queue.fifo,
      visibilityTimeoutSeconds: queue.visibilityTimeoutSeconds,
      maxAttempts: queue.retry.maxAttempts,
      retry: {
        maxAttempts: queue.retry.maxAttempts,
        baseMs: queue.retry.baseMs,
        maxMs: queue.retry.maxMs,
      },
      dlq: {
        name: `${queue.name}${DEAD_LETTER_SUFFIX}`,
        maxReceiveCount: queue.deadLetter.maxReceiveCount,
        retentionSeconds: queue.deadLetter.retentionDays * SECONDS_PER_DAY,
      },
      subscriptions: this.subscriptionsOf(queue, index),
      consumer: service,
      producers: this.sorted(producers),
      description: queue.description,
    };
  }

  private subscriptionsOf(
    queue: QueueDefinition,
    index: ContractIndex,
  ): JsonObject[] {
    return queue.subscriptions
      .map((subscription) => {
        if (!index.topics.has(subscription.topic)) {
          throw ExportError.forTopology(
            `la cola ${queue.name} se suscribe a ${subscription.topic.name}, que ningún contrato declara`,
          );
        }
        return {
          topic: subscription.topic.name,
          filterTypes: this.sorted(subscription.events.map((e) => e.type)),
        };
      })
      .sort((a, b) => this.compare(a.topic, b.topic));
  }

  private indexContracts(contracts: readonly ServiceContract[]): ContractIndex {
    const topics = new Map<TopicDefinition, Owned<TopicDefinition>>();
    const queues: Owned<QueueDefinition>[] = [];
    const commands = new Map<CommandDefinition, string>();
    for (const contract of contracts) {
      const { service } = contract;
      for (const topic of Object.values(contract.topics)) {
        topics.set(topic, { service, value: topic });
      }
      for (const queue of Object.values(contract.queues)) {
        queues.push({ service, value: queue });
      }
      for (const command of Object.values(contract.commands)) {
        commands.set(command, service);
      }
    }
    return { topics, queues, commands };
  }

  private byName(a: { name: string }, b: { name: string }): number {
    return this.compare(a.name, b.name);
  }

  /** Orden por código de unidad, igual en cualquier configuración regional. */
  private compare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  private sorted(values: Iterable<string>): string[] {
    return [...new Set(values)].sort();
  }
}
