/** What a WebAuthn challenge was requested for. */
export enum WebAuthnPurpose {
  Registration = 'registration',
  SignIn = 'sign_in',
  Mfa = 'mfa',
  StepUp = 'step_up',
}

/** A pending WebAuthn challenge: lives five minutes and is used once. */
export interface WebAuthnChallenge {
  readonly id: string;
  readonly challenge: string;
  readonly purpose: WebAuthnPurpose;
  /** Owner user, except in usernameless sign-in. */
  readonly userId?: string;
  readonly homeTenantId?: string;
}
