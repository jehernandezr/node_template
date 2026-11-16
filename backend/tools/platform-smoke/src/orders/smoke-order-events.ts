import { defineEvent } from '@contracts/platform';
import { z } from 'zod';

/** Evento que publica el pedido al confirmarse; el outbox lo entrega después del commit. */
export const SmokeOrderCreated = defineEvent({
  type: 'smoke.order.created.v1',
  payload: z.object({
    orderId: z.string(),
    customer: z.string(),
  }),
  description: 'Se registró un pedido.',
});
