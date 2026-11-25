/** Result of handling a delivery. */
export enum DispatchOutcome {
  Processed = 'processed',
  Duplicate = 'duplicate',
  /** Event type without a handler: acknowledged and discarded. */
  Ignored = 'ignored',
  RetryLater = 'retry-later',
  DeadLetter = 'dead-letter',
  /**
   * Another delivery of the same message holds the claim and its lease is still valid (the
   * first handler may still be running). It is never acknowledged: it is left for
   * redelivery, for example as a failed item of the SQS batch.
   */
  InProgress = 'in-progress',
}
