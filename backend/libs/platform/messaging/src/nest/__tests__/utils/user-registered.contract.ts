import { defineEvent } from '@contracts/platform';
import { z } from 'zod';

/** Evento de prueba que consumen los manejadores de `@Subscribe`. */
export const UserRegisteredV1 = defineEvent({
  type: 'tests.user.registered.v1',
  payload: z.object({ userId: z.string().min(1) }),
  description: 'Se registró un usuario.',
});
