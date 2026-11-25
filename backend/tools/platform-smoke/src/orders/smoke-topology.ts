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
  description: 'Eventos de pedidos de la prueba de humo.',
});

/** Contract of the test service: a topic with the event and the queue that subscribes to it. */
export const smokeContract = defineServiceContract({
  service: 'smoke',
  description: 'Prueba de humo de la plataforma.',
  events: { orderCreated: SmokeOrderCreated },
  topics: { orders: ordersTopic },
  queues: {
    orders: defineQueue({
      name: SmokeQueue.Orders,
      visibilityTimeoutSeconds: 30,
      retry: { maxAttempts: 3, baseMs: 100, maxMs: 1_000 },
      subscriptions: [{ topic: ordersTopic, events: [SmokeOrderCreated] }],
      description: 'Pedidos que consume la prueba de humo.',
    }),
  },
});

/** Topology of the test service, built from its contract. */
export class SmokeTopology {
  static readonly topology = topologyFromContracts([smokeContract]);
}
