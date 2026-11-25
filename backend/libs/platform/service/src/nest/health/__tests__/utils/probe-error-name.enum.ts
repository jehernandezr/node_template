/** Error names that the health tests simulate or expect. */
export enum ProbeErrorName {
  Connection = 'ConnectionError',
  /** The one `AbortSignal.throwIfAborted()` throws with an already aborted signal. */
  Abort = 'AbortError',
}
