/** State of an idempotency key when requesting the claim. */
export enum ClaimState {
  /** This attempt owns the key until `leaseUntil` and must complete or release it. */
  Acquired = 'acquired',
  /** Another attempt owns it and its lease is still valid. */
  InProgress = 'in-progress',
  /** The operation already finished; the stored result is returned. */
  Completed = 'completed',
}
