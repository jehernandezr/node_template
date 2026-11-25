/** A key range of a table: after `after` and up to `upTo`, inclusive. Without an end, it is unbounded. */
export interface KeyRange {
  readonly after?: readonly string[];
  readonly upTo?: readonly string[];
}
