/** Llave de idempotencia tomada por esta llamada, con su token de fencing. */
export interface ClaimedOperation {
  readonly key: string;
  readonly claimToken: string;
}
