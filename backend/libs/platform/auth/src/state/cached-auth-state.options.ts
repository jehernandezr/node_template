/** Options of `CachedAuthStateReader`. */
export interface CachedAuthStateOptions {
  /** How long an epoch or a permission version lives in memory. */
  readonly ttlMs: number;
  /** Maximum entries per data type; when exceeded, the least used is evicted. */
  readonly maxEntries: number;
}
