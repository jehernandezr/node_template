/** Qué hacer con una entrega fallida. */
export enum ErrorDisposition {
  Retry = 'retry',
  DeadLetter = 'dead-letter',
}
