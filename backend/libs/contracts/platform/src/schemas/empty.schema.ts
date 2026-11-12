import { z } from 'zod';

/** Petición sin campos. Es la petición por defecto de una ruta. */
export const EmptySchema = z
  .strictObject({})
  .describe('Petición sin campos.') satisfies z.ZodType<Record<string, never>>;
