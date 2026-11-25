/** What to do with the `traceparent` of an incoming request. */
export enum IncomingTraceparentPolicy {
  /** Continue the received trace (internal calls, messages, sagas). */
  Continue = 'continue',
  /**
   * Open a new trace with its own UUIDv7 `traceId` and store the received trace id
   * as `externalTraceId`.
   */
  External = 'external',
}
