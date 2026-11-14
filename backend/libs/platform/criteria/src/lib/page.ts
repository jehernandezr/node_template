import type { Page } from '@contracts/platform';
import { encodeCursor, type CursorOptions } from './cursor.js';
import { assertLimit } from './validation.js';

/** One page of results: the contract type, so the response schema accepts it as is. */
export type { Page };

/**
 * Applies the original limit to rows fetched with `limit + 1` and builds the next cursor.
 * One extra row means a next page exists; it is dropped and the cursor points at the last kept row.
 * @param getSortValues values of the orderBy fields other than id, in the same order. Must not be null.
 */
export function takePage<T>(
  rows: readonly T[],
  limit: number | undefined,
  getId: (row: T) => string,
  getSortValues: (row: T) => readonly unknown[],
  cursorOptions?: CursorOptions,
): Page<T> {
  if (limit === undefined) {
    return { items: [...rows], nextCursor: null };
  }
  assertLimit(limit);
  if (rows.length <= limit) {
    return { items: [...rows], nextCursor: null };
  }
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: encodeCursor(
      { values: getSortValues(last), id: getId(last) },
      cursorOptions,
    ),
  };
}
