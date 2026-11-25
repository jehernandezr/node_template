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

/** Translates a contract queue into its topology definition. */
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
 * Builds the runtime topology of a service from its
 * contracts.
 *
 * It receives the service's own contract and those of the services it
 * talks to: the owners of the commands it sends (`sends`) and of the topics
 * its queues subscribe to. The topics of a subscription are included even if
 * their contract is missing, because the definition travels with the subscription; a command in
 * `sends` needs the contract that declares its queue.
 *
 * Each event gets the route to its topic and each command the route to its queue, with
 * the kit contract, so the bus and the relay validate the payload and the
 * dispatcher knows whether a type without a handler is an event (ignored) or a
 * command. The topology is validated before being returned (`TopologyError` if it is not
 * valid).
 */
export function topologyFromContracts(
  contracts: readonly ServiceContract[],
): Topology {
  // By name: a subscriber points to another service's topic with a reference, which is a different object.
  const topics = new Map<string, TopicDef>();
  const queues: QueueDef[] = [];
  const routes: RouteDef[] = [];
  // By type, for the same reason: what a service sends can be a reference to the command.
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
