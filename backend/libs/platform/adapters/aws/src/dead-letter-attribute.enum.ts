/** Attributes that accompany a message copied to the DLQ. */
export enum DeadLetterAttribute {
  Error = 'platform-error',
  ErrorCode = 'platform-error-code',
  SourceQueue = 'platform-source-queue',
}
