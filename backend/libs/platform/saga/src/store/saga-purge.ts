/** What `SagaStore.purge` deletes. */
export interface SagaPurge {
  /** Deletes the `Completed` or `Compensated` sagas whose last update is earlier than this instant. */
  readonly before: Date;
  /** Maximum sagas per call. By default, `SagaStore.DEFAULT_PURGE_LIMIT`. */
  readonly limit?: number;
}
