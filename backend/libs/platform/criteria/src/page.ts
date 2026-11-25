/** A page of results. `nextCursor` is `null` on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
