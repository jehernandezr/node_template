/** Whether the saga advances or undoes the steps already completed. */
export enum StepDirection {
  Forward = 'forward',
  Compensate = 'compensate',
}
