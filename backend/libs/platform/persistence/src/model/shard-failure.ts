/** Shard que no respondió a tiempo o falló durante un recorrido. */
export interface ShardFailure {
  readonly shard: string;
  readonly timedOut: boolean;
  /** Código estable del error, si era un `PlatformError`. */
  readonly code?: string;
}
