/** Posesión vigente de un `JobLock`. */
export interface JobLease {
  readonly name: string;
  /** Token de fencing: solo quien lo tiene puede liberar. */
  readonly token: string;
}
