import {
  DEAD_LETTER_SUFFIX,
  MessageKind,
  type CommandDefinition,
  type QueueDefinition,
  type ServiceContract,
  type TopicDefinition,
} from '@contracts/platform';
import { checkGlobalUniqueness, type JsonObject } from './build-export.js';

/** Versión del formato de `topology.json`. Terraform y LocalStack la leen. */
export const TOPOLOGY_FORMAT_VERSION = 1;

/** Ruta de `topology.json`, relativa a `backend/`. */
export const TOPOLOGY_PATH = 'infra/terraform/topology.json';

const SECONDS_PER_DAY = 86_400;

/** Tipo de destino de una ruta; coincide con `TargetKind` de `@platform/messaging`. */
enum TargetKind {
  Topic = 'topic',
  Queue = 'queue',
}

function fail(message: string): never {
  throw new Error(`topology-export: ${message}`);
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

interface Owned<T> {
  readonly service: string;
  readonly value: T;
}

/** Índices globales: qué servicio declara cada tópico, cola y comando. */
function indexContracts(contracts: readonly ServiceContract[]) {
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

/**
 * Construye la topología de mensajería desde los contratos: tópicos con sus
 * productores, colas con su consumidor, suscripciones con filtros por tipo y
 * la ruta de cada evento y comando. Es la entrada del módulo `messaging` de
 * Terraform y del script de LocalStack.
 *
 * El formato extiende el de `Topology.toJSON()` de `@platform/messaging` con
 * `owner`, `producers`, `consumer` y `retry`, para derivar permisos IAM.
 */
export function buildTopology(
  contracts: readonly ServiceContract[],
): JsonObject {
  checkGlobalUniqueness(contracts);
  const index = indexContracts(contracts);

  const senders = new Map<CommandDefinition, Set<string>>();
  for (const contract of contracts) {
    for (const command of contract.sends) {
      if (!index.commands.has(command)) {
        fail(
          `${contract.service} envía ${command.type}, que ningún contrato declara`,
        );
      }
      const set = senders.get(command) ?? new Set<string>();
      set.add(contract.service);
      senders.set(command, set);
    }
  }

  const routes: JsonObject[] = [];
  const topics = [...index.topics.values()]
    .sort((a, b) => byName(a.value, b.value))
    .map(({ service, value: topic }) => {
      for (const event of topic.events) {
        routes.push({
          type: event.type,
          kind: MessageKind.Event,
          target: topic.name,
          targetKind: TargetKind.Topic,
          owner: service,
        });
      }
      return {
        name: topic.name,
        fifo: topic.fifo,
        owner: service,
        producers: [service],
        description: topic.description,
      };
    });

  const queues = [...index.queues]
    .sort((a, b) => byName(a.value, b.value))
    .map(({ service, value: queue }) => {
      const producers = new Set<string>();
      for (const command of queue.commands) {
        routes.push({
          type: command.type,
          kind: MessageKind.Command,
          target: queue.name,
          targetKind: TargetKind.Queue,
          owner: service,
        });
        for (const sender of senders.get(command) ?? []) producers.add(sender);
      }
      const subscriptions = queue.subscriptions
        .map((subscription) => {
          if (!index.topics.has(subscription.topic)) {
            fail(
              `la cola ${queue.name} se suscribe a ${subscription.topic.name}, que ningún contrato declara`,
            );
          }
          return {
            topic: subscription.topic.name,
            filterTypes: sorted(subscription.events.map((e) => e.type)),
          };
        })
        .sort((a, b) => (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
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
        subscriptions,
        consumer: service,
        producers: sorted(producers),
        description: queue.description,
      };
    });

  routes.sort((a, b) =>
    String(a['type']) < String(b['type'])
      ? -1
      : String(a['type']) > String(b['type'])
        ? 1
        : 0,
  );

  return {
    $comment:
      'GENERADO por backend/tools/contracts-export desde los contratos. No editar: ejecuta pnpm nx run contracts-export:topology-export.',
    formatVersion: TOPOLOGY_FORMAT_VERSION,
    topics,
    queues,
    routes,
  };
}
