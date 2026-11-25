/** Parameters of a cursor-paginated request. */
export interface PageQuery {
  /** Page size, between 1 and `Pagination.maxLimit`. */
  limit?: number;
  /** Opaque cursor returned by the previous page. */
  after?: string;
}

/** Page of results. `nextCursor` is null on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
