/** Options of `ShardDataSources`. */
export interface ShardDataSourcesOptions {
  /** Idle milliseconds after which a `DataSource` is closed. */
  readonly idleTtlMs: number;
}
