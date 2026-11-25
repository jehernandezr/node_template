/** Current ownership of a `JobLock`. */
export interface JobLease {
  readonly name: string;
  /** Fencing token: only its holder can release. */
  readonly token: string;
}
