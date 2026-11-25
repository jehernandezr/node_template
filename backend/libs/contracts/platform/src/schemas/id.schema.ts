import { z } from 'zod';

/** UUIDv7 identifier. Every platform identifier uses this scheme. */
export const IdSchema = z
  .uuid({ version: 'v7' })
  .describe('UUIDv7 identifier.') satisfies z.ZodType<string>;
