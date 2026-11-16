/** Opciones de `ShardDataSources`. */
export interface ShardDataSourcesOptions {
  /** Milisegundos sin uso tras los que un `DataSource` se cierra. */
  readonly idleTtlMs: number;
}
