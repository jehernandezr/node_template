import type { z } from 'zod';

/** Input and output schemas of an operation. */
export interface OperationSchemas {
  readonly input: z.ZodType;
  readonly output: z.ZodType;
}
