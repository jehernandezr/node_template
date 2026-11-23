/** Cómo responde el proveedor falso a cada cobro (`BILLING_FAKE_PAYMENT_OUTCOME`). */
export enum FakePaymentOutcome {
  Approved = 'approved',
  Declined = 'declined',
  /** El cobro queda en curso: el resultado llega después por `mark-paid` o `mark-failed`, como un webhook. */
  Pending = 'pending',
}
