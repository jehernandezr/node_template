import type {
  CommandDefinition,
  QueueDefinition,
  ServiceContract,
  TopicDefinition,
} from '@contracts/platform';
import { PlatformErrorCode } from '@contracts/platform';
import { MessagingError } from '../errors/messaging-error.js';
import { QueueDef } from './queue-def.js';
import { RetryPolicy } from './retry-policy.js';
import { Route, type RouteDef } from './route.js';
import { TopicDef } from './topic-def.js';
import { Topology } from './topology.js';

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
 * Builds the runtime topology of a service from the contracts.
 *
 * Pass the service's own contract and those of the services it talks to: the
 * owners of the commands it sends (`sends`) and of the topics its queues
 * subscribe to. The topics of a subscription are included even when their
 * contract is missing, because the definition travels with the subscription; a
 * command in `sends` needs the contract that declares its queue.
 *
 * Each event gets the route to its topic and each command the route to its
 * queue, with the contract of the kit, so the bus and the relay validate the
 * payload and the dispatcher knows whether a type without a handler is an event
 * (ignored) or a command. The topology is validated before it is returned
 * (`TopologyError` when invalid).
 */
export function topologyFromContracts(
  contracts: readonly ServiceContract[],
): Topology {
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
          PlatformErrorCode.MessagingInvalidTopology,
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
