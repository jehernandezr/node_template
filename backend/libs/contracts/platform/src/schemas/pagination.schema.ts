import { z } from 'zod';
import { Pagination } from '../constants/pagination.constants.js';
import type { Page, PageQuery } from '../types/pagination.type.js';

/** Opaque base64url cursor, with bounded length. */
export const CursorSchema = z
  .string()
  .min(1)
  .max(Pagination.maxCursorLength)
  .regex(new RegExp(Pagination.cursorPattern))
  .describe('Opaque pagination cursor.') satisfies z.ZodType<string>;

/** Page size, between 1 and `Pagination.maxLimit`. */
export const PageLimitSchema = z
  .int()
  .min(1)
  .max(Pagination.maxLimit)
  .describe('Page size.') satisfies z.ZodType<number>;

/** Parameters of a cursor-paginated request. */
export const PageQuerySchema = z
  .strictObject({
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe('Cursor pagination parameters.') satisfies z.ZodType<PageQuery>;

/**
 * Schema of a page of `item`. Each contract registers the concrete page
 * with its own name, for example `SessionPage`.
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
