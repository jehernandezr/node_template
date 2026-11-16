import type { z } from 'zod';

/** Esquemas de entrada y salida de una operación. */
export interface OperationSchemas {
  readonly input: z.ZodType;
  readonly output: z.ZodType;
}
