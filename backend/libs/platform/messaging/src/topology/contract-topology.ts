import type {
  QueueDefinition,
  ServiceContract,
  TopicDefinition,
} from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { MessagingError } from '../errors/messaging-error.js';
import { QueueDef } from './queue-def.js';
import { Route } from './route.js';
import type { RouteDef } from './route-def.js';
import { TopicDef } from './topic-def.js';
import { Topology } from './topology.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';

/** Traduce una cola del contrato a su definición de topología. */
function queueDefOf(
  queue: QueueDefinition,
  topicDef: (topic: TopicDefinition) => TopicDef,
): QueueDef {
  const def = new QueueDef(queue.name)
    .visibilityTimeout(queue.visibilityTimeoutSeconds)
    .retry(
      new RetryPolicy(
        queue.retry.maxAttempts,
        queue.retry.baseMs,
        queue.retry.maxMs,
        BackoffStrategy.FullJitter,
      ),
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
 * Construye la topología en tiempo de ejecución de un servicio a partir de sus
 * contratos.
 *
 * Se pasan el contrato del propio servicio y los de los servicios con los que
 * habla: los dueños de los comandos que envía (`sends`) y de los tópicos a los
 * que se suscriben sus colas. Los tópicos de una suscripción entran aunque falte
 * su contrato, porque la definición viaja con la suscripción; un comando de
 * `sends` necesita el contrato que declara su cola.
 *
 * Cada evento obtiene la ruta a su tópico y cada comando la ruta a su cola, con
 * el contrato del kit, así el bus y el relay validan el payload y el
 * dispatcher sabe si un tipo sin manejador es un evento (se ignora) o un
 * comando. La topología se valida antes de devolverse (`TopologyError` si no es
 * válida).
 */
export function topologyFromContracts(
  contracts: readonly ServiceContract[],
): Topology {
  // Por nombre: un suscriptor apunta al tópico de otro servicio con una referencia, que es otro objeto.
  const topics = new Map<string, TopicDef>();
  const queues: QueueDef[] = [];
  const routes: RouteDef[] = [];
  // Por tipo, por la misma razón: lo que un servicio envía puede ser una referencia al comando.
  const commandQueues = new Map<string, QueueDef>();

  const topicDef = (topic: TopicDefinition): TopicDef => {
    let def = topics.get(topic.name);
    if (!def) {
      def = new TopicDef(topic.name, { fifo: topic.fifo });
      topics.set(topic.name, def);
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
        commandQueues.set(command.type, def);
        routes.push(Route.command(command).to(def));
      }
    }
  }
  for (const contract of contracts) {
    for (const command of contract.sends) {
      if (!commandQueues.has(command.type)) {
        throw new MessagingError(
          MessagingErrorCode.InvalidTopology,
          `${contract.service} sends "${command.type}", but none of the given contracts declares its queue`,
        );
      }
    }
  }

  const topology = new Topology({
    topics: [...topics.values()],
    queues,
    routes,
  });
  topology.assertValid();
  return topology;
}
