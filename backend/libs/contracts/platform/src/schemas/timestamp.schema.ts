import { z } from 'zod';

/** ISO 8601 instant with zone `Z` (UTC), for example `2026-11-12T10:00:00.000Z`. */
export const TimestampSchema = z.iso
  .datetime()
  .describe('ISO 8601 instant in UTC.') satisfies z.ZodType<string>;
