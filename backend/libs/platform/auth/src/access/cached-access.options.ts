/** Options of `CachedAccessResolver`. */
export interface CachedAccessOptions {
  /** How long a read grant lives in memory. */
  readonly ttlMs: number;
  /** Maximum entries; when exceeded, the least used one is evicted. */
  readonly maxEntries: number;
}
