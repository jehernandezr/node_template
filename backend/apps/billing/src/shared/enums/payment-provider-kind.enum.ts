/** Charge providers selected by `BILLING_PAYMENT_PROVIDER`. A real one replaces `none` when it lands. */
export enum PaymentProviderKind {
  Fake = 'fake',
  /** Never charges: every invoice stays issued (ADR 0046). */
  None = 'none',
}
