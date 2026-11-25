/** A saga that the job could not resume because of an error. */
export interface RecoveryFailure {
  readonly sagaId: string;
  /** Code of the `PlatformError`, or `PLATFORM.INTERNAL.UNEXPECTED` for any other error. */
  readonly errorCode: string;
  /** Code, or name and message, of the error, without input values. */
  readonly detail: string;
}

/** Result of one pass of the recovery job. */
export interface RecoveryReport {
  readonly resumed: string[];
  readonly failed: RecoveryFailure[];
}
