/** What the error translator needs to know about the call that failed. */
export interface CallErrorContext {
  /** Whether any attempt was sent. */
  readonly started: boolean;
  /** Caller's cancellation signal. */
  readonly signal?: AbortSignal;
}
