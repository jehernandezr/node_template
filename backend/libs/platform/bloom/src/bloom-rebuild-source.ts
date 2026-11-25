/** Batches of items read from a filter's source of truth, to rebuild it. */
export type BloomRebuildSource =
  AsyncIterable<readonly string[]> | Iterable<readonly string[]>;

/** Creates a new source on each call: each rebuild reads it from the start. */
export type BloomRebuildSourceFactory = () => BloomRebuildSource;
