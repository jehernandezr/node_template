/** Limit of an operation. `Deadline` from `@platform/primitives` satisfies it. */
export interface ClaimDeadline {
  /** Limit instant in epoch milliseconds. */
  readonly atMs: number;
}

export interface ClaimRequest {
  /**
   * Hash of the input, for example `CanonicalJson.digest(input)`. It is stored
   * with the first claim; if a later attempt brings a different one, the caller rejects it.
   */
  readonly fingerprint: string;
  /** Limit of the operation. The lease lasts until the limit plus `leaseMarginMs`. */
  readonly deadline: ClaimDeadline;
  /** Margin over the limit. Defaults to 5 000 ms. */
  readonly leaseMarginMs?: number;
  /**
   * Minimum lease duration from now. Messaging uses it so the lease
   * is never shorter than the queue visibility timeout.
   */
  readonly minLeaseMs?: number;
  /**
   * Tenant whose data the key protects. The store saves it next to the key so that moving the tenant to
   * another shard takes its keys along and a retry after the move does not repeat the effects on the target.
   */
  readonly tenantId?: string;
}
