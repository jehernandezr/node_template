/** Scope of a timeout. */
export enum TimeoutScope {
  /** An attempt ran out of time. */
  Attempt = 'attempt',
  /** The whole call ran out of budget. */
  Total = 'total',
}
