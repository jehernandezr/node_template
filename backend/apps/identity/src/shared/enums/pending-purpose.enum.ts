/** What a pending authentication was opened for. */
export enum PendingPurpose {
  /** Sign-in that still needs to be completed with a second factor. */
  SignIn = 'sign_in',
  /** Additional step of an already open session. */
  StepUp = 'step_up',
  /** Second factor recovery without a device. */
  Recovery = 'recovery',
}
