import { z } from 'zod';
import type { UserRef } from '../types/user-ref.type.js';
import { IdSchema } from './id.schema.js';

/** User and the tenant where their data lives. */
export const UserRefSchema = z
  .object({ userId: IdSchema, homeTenantId: IdSchema })
  .describe(
    'Reference to a user with their home tenant.',
  ) satisfies z.ZodType<UserRef>;
