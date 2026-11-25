/** How a charge attempt ended up. */
export enum PaymentStatus {
  /**
   * Recorded before requesting the charge, with no response yet: the request is in flight or the process crashed midway. It
   * is resumed with the same idempotency key, never with a new charge.
   */
  Requested = 'requested',
  Approved = 'approved',
  Declined = 'declined',
  /** The provider responds later; the result arrives through `mark-paid` or `mark-failed`. */
  Pending = 'pending',
}
