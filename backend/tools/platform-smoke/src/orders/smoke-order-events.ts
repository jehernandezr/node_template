import { defineEvent } from '@contracts/platform';
import { z } from 'zod';

/** Event the order publishes when confirmed; the outbox delivers it after the commit. */
export const SmokeOrderCreated = defineEvent({
  type: 'smoke.order.created.v1',
  payload: z.object({
    orderId: z.string(),
    customer: z.string(),
  }),
  description: 'An order was registered.',
});
