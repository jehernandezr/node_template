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

/** Contrato del servicio de prueba: un tópico con el evento y la cola que se suscribe a él. */
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

/** Topología del servicio de prueba, armada desde su contrato. */
export class SmokeTopology {
  static readonly topology = topologyFromContracts([smokeContract]);
}
