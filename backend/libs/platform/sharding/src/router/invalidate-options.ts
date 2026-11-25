/** Options of `ShardRouter.invalidate`. */
export interface InvalidateOptions {
  /**
   * Placement version just committed in the directory. With it, the
   * tombstone rejects every earlier version and still lets this one be cached. Without it, the
   * tombstone goes above the highest version this router sees, or
   * rejects every write until it expires when it knows none.
   */
  readonly version?: number;
}
