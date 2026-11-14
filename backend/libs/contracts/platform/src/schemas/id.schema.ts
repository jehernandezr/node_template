import { z } from 'zod';

/** Identificador UUIDv7. Todo identificador de la plataforma usa este esquema. */
export const IdSchema = z
  .uuid({ version: 'v7' })
  .describe('Identificador UUIDv7.') satisfies z.ZodType<string>;
