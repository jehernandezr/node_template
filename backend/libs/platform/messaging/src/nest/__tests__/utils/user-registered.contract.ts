import { defineEvent } from '@contracts/platform';
import { z } from 'zod';

/** Test event consumed by the `@Subscribe` handlers. */
export const UserRegisteredV1 = defineEvent({
  type: 'tests.user.registered.v1',
  payload: z.object({ userId: z.string().min(1) }),
  description: 'A user was registered.',
});
