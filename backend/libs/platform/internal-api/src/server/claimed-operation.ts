/** Idempotency key taken by this call, with its fencing token. */
export interface ClaimedOperation {
  readonly key: string;
  readonly claimToken: string;
}
