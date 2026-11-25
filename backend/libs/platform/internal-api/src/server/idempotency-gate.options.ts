/** Settings of the idempotency lease. */
export interface IdempotencyGateOptions {
  /**
   * Extra time the claim outlives the request deadline, so a
   * slow handler keeps the key until it finishes. By default, the store's (5 s).
   */
  readonly leaseMarginMs?: number;
  /** Shortest lease, counted from the claim. None by default. */
  readonly minLeaseMs?: number;
}
