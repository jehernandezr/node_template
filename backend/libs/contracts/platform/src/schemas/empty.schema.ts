import { z } from 'zod';

/** Request without fields. It is the default request of a route. */
export const EmptySchema = z
  .strictObject({})
  .describe('Request without fields.') satisfies z.ZodType<
  Record<string, never>
>;
