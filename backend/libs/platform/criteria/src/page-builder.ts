import type { CursorCodec } from './cursor-codec.js';
import { CriteriaValidator } from './criteria-validator.js';
import type { Page } from './page.js';

/** Builds a page of results and the next cursor with the `CursorCodec` it receives. */
export class PageBuilder {
  constructor(private readonly codec: CursorCodec) {}

  /**
   * Applies the original limit to rows read with `limit + 1`: an extra row means there is another page,
   * it is discarded and the cursor points to the last row that stays.
   * @param getSortValues values of the `orderBy` fields other than the id, in the same order. Cannot be null.
   * @throws CriteriaError `InvalidLimit` if `limit` is not an integer between 1 and `MAX_LIMIT`.
   */
  build<T>(
    rows: readonly T[],
    limit: number | undefined,
    getId: (row: T) => string,
    getSortValues: (row: T) => readonly unknown[],
  ): Page<T> {
    if (limit === undefined) {
      return { items: [...rows], nextCursor: null };
    }
    CriteriaValidator.limit(limit);
    if (rows.length <= limit) {
      return { items: [...rows], nextCursor: null };
    }
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: this.codec.encode({
        values: getSortValues(last),
        id: getId(last),
      }),
    };
  }
}
