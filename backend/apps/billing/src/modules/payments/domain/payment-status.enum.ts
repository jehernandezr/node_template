/** En qué quedó un intento de cobro. */
export enum PaymentStatus {
  /**
   * Anotado antes de pedir el cobro, sin respuesta todavía: el pedido está en vuelo o el proceso cayó a mitad. Se
   * retoma con la misma llave de idempotencia, nunca con un cobro nuevo.
   */
  Requested = 'requested',
  Approved = 'approved',
  Declined = 'declined',
  /** El proveedor responde después; el resultado llega por `mark-paid` o `mark-failed`. */
  Pending = 'pending',
}
