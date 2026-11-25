/** Status of an attempt saved in the step journal. */
export enum StepStatus {
  /** Written before the call; the result is not known yet. */
  Dispatched = 'dispatched',
  Succeeded = 'succeeded',
  /** Definitive business error: the operation was not applied. */
  Failed = 'failed',
  /** Transient failure, unknown result or protocol violation: the operation may have applied. */
  Uncertain = 'uncertain',
}
