import type {
  CommandDefinition,
  QueueDefinition,
  ServiceContract,
  TopicDefinition,
} from '@contracts/platform';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import { QueueDef } from './queue-def.js';
import { RetryPolicy } from './retry-policy.js';
import { Route, type RouteDef } from './route.js';
import { TopicDef } from './topic-def.js';
import { Topology } from './topology.js';

/**
 * Topología de ejecución construida desde las secciones `topics` y `queues` de
 * los contratos. Es la misma fuente que lee `contracts-export` para Terraform y
 * LocalStack, así el despacho en ejecución y la infraestructura no divergen.
 */
export class ContractTopology extends Topology {
  readonly topics: readonly TopicDef[];
  readonly queues: readonly QueueDef[];
  readonly routes: readonly RouteDef[];

  constructor(
    topics: readonly TopicDef[],
    queues: readonly QueueDef[],
    routes: readonly RouteDef[],
  ) {
    super();
    this.topics = Object.freeze([...topics]);
    this.queues = Object.freeze([...queues]);
    this.routes = Object.freeze([...routes]);
  }
}

function queueDefOf(
  queue: QueueDefinition,
  topicDef: (topic: TopicDefinition) => TopicDef,
): QueueDef {
  const def = new QueueDef(queue.name)
    .visibilityTimeout(queue.visibilityTimeoutSeconds)
    .retry(
      RetryPolicy.exponential({
        maxAttempts: queue.retry.maxAttempts,
        baseMs: queue.retry.baseMs,
        maxMs: queue.retry.maxMs,
        jitter: true,
      }),
    )
    .deadLetter({
      maxReceiveCount: queue.deadLetter.maxReceiveCount,
      retentionDays: queue.deadLetter.retentionDays,
    });
  if (queue.fifo) def.fifo();
  for (const subscription of queue.subscriptions) {
    def.subscribesTo(topicDef(subscription.topic), {
      types: subscription.events.map((event) => event.type),
    });
  }
  return def;
}

/**
 * Construye la topología de ejecución de un servicio desde los contratos.
 *
 * Pasa el contrato propio y los de los servicios con los que habla: los dueños
 * de los comandos que envía (`sends`) y de los tópicos a los que se suscriben
 * sus colas. Los tópicos de una suscripción entran aunque su contrato no esté,
 * porque la definición viaja con la suscripción; un comando de `sends` exige el
 * contrato que declara su cola.
 *
 * Cada evento queda con la ruta a su tópico y cada comando con la ruta a su
 * cola, con el contrato del kit, así el bus y el relay validan el payload y el
 * dispatcher sabe si un tipo sin handler es un evento (se ignora) o un comando.
 * Valida la topología antes de devolverla (`TopologyError` si no es válida).
 */
export function topologyFromContracts(
  contracts: readonly ServiceContract[],
): ContractTopology {
  const topics = new Map<TopicDefinition, TopicDef>();
  const queues: QueueDef[] = [];
  const routes: RouteDef[] = [];
  const commandQueues = new Map<CommandDefinition, QueueDef>();

  const topicDef = (topic: TopicDefinition): TopicDef => {
    let def = topics.get(topic);
    if (!def) {
      def = new TopicDef(topic.name, { fifo: topic.fifo });
      topics.set(topic, def);
      for (const event of topic.events) {
        routes.push(Route.event(event).to(def));
      }
    }
    return def;
  };

  for (const contract of contracts) {
    for (const topic of Object.values(contract.topics)) topicDef(topic);
  }
  for (const contract of contracts) {
    for (const queue of Object.values(contract.queues)) {
      const def = queueDefOf(queue, topicDef);
      queues.push(def);
      for (const command of queue.commands) {
        commandQueues.set(command, def);
        routes.push(Route.command(command).to(def));
      }
    }
  }
  for (const contract of contracts) {
    for (const command of contract.sends) {
      if (!commandQueues.has(command)) {
        throw new MessagingError(
          MessagingErrorCode.InvalidTopology,
          `${contract.service} sends "${command.type}", but none of the given contracts declares its queue`,
        );
      }
    }
  }

  const topology = new ContractTopology([...topics.values()], queues, routes);
  topology.assertValid();
  return topology;
}
