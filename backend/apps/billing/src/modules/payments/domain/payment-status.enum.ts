/** Cómo terminó un intento de cobro. */
export enum PaymentStatus {
  Approved = 'approved',
  Declined = 'declined',
  /** El proveedor responde después; el resultado llega por `mark-paid` o `mark-failed`. */
  Pending = 'pending',
}
