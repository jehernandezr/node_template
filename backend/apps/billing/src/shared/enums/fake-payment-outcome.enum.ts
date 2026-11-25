/** How the fake provider responds to each charge (`BILLING_FAKE_PAYMENT_OUTCOME`). */
export enum FakePaymentOutcome {
  Approved = 'approved',
  Declined = 'declined',
  /** The charge stays pending: the result arrives later through `mark-paid` or `mark-failed`, like a webhook. */
  Pending = 'pending',
}
