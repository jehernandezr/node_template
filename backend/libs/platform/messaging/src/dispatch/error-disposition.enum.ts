/** What to do with a failed delivery. */
export enum ErrorDisposition {
  Retry = 'retry',
  DeadLetter = 'dead-letter',
}
