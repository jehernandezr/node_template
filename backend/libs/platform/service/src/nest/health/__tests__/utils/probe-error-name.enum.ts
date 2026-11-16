/** Nombres de error que simulan o esperan las pruebas de salud. */
export enum ProbeErrorName {
  Connection = 'ConnectionError',
  /** El que lanza `AbortSignal.throwIfAborted()` con una señal ya abortada. */
  Abort = 'AbortError',
}
