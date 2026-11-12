import { z } from 'zod';
import { Pagination } from '../constants/pagination.constants.js';
import type { Page, PageQuery } from '../types/pagination.type.js';

/** Cursor opaco en base64url, con longitud acotada. */
export const CursorSchema = z
  .string()
  .min(1)
  .max(Pagination.maxCursorLength)
  .regex(new RegExp(Pagination.cursorPattern))
  .describe('Cursor opaco de paginación.') satisfies z.ZodType<string>;

/** Tamaño de página, entre 1 y `Pagination.maxLimit`. */
export const PageLimitSchema = z
  .int()
  .min(1)
  .max(Pagination.maxLimit)
  .describe('Tamaño de página.') satisfies z.ZodType<number>;

/** Parámetros de una petición paginada por cursor. */
export const PageQuerySchema = z
  .strictObject({
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Parámetros de paginación por cursor.',
  ) satisfies z.ZodType<PageQuery>;

/**
 * Esquema de una página de `item`. Cada contrato registra la página concreta
 * con su propio nombre, por ejemplo `SessionPage`.
 */
export function pageOf<T extends z.ZodType>(item: T, description?: string) {
  const schema = z.object({
    items: z.array(item).max(Pagination.maxLimit),
    nextCursor: CursorSchema.nullable(),
  });
  return (
    description ? schema.describe(description) : schema
  ) satisfies z.ZodType<Page<z.output<T>>>;
}
