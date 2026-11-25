/** Last part of the idempotency key of a saga step: the forward step or its compensation. */
export enum StepKeyDirection {
  Forward = 'forward',
  Compensate = 'compensate',
}
