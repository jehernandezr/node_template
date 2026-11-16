import { z } from 'zod';
import type { UserRef } from '../types/user-ref.type.js';
import { IdSchema } from './id.schema.js';

/** Usuario y el tenant donde viven sus datos. */
export const UserRefSchema = z
  .object({ userId: IdSchema, homeTenantId: IdSchema })
  .describe(
    'Referencia a un usuario con su tenant de origen.',
  ) satisfies z.ZodType<UserRef>;
