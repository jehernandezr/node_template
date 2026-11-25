import {
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { topologyFromContracts } from '@platform/messaging';
import { SmokeOrderCreated } from './smoke-order-events.js';
import { SmokeQueue } from './smoke-queue.enum.js';

const ordersTopic = defineTopic({
  name: 'smoke-orders-events',
  events: [SmokeOrderCreated],
  description: 'Order events of the smoke test.',
});

/** Contract of the test service: a topic with the event and the queue that subscribes to it. */
export const smokeContract = defineServiceContract({
  service: 'smoke',
  description: 'Platform smoke test.',
  events: { orderCreated: SmokeOrderCreated },
  topics: { orders: ordersTopic },
  queues: {
    orders: defineQueue({
      name: SmokeQueue.Orders,
      visibilityTimeoutSeconds: 30,
      retry: { maxAttempts: 3, baseMs: 100, maxMs: 1_000 },
      subscriptions: [{ topic: ordersTopic, events: [SmokeOrderCreated] }],
      description: 'Orders consumed by the smoke test.',
    }),
  },
});

/** Topology of the test service, built from its contract. */
export class SmokeTopology {
  static readonly topology = topologyFromContracts([smokeContract]);
}
