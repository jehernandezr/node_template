import { z } from 'zod';

/** Instante en ISO 8601 con zona `Z` (UTC), por ejemplo `2026-11-12T10:00:00.000Z`. */
export const TimestampSchema = z.iso
  .datetime()
  .describe('Instante ISO 8601 en UTC.') satisfies z.ZodType<string>;
