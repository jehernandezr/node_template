/** Para qué se pidió un desafío de WebAuthn. */
export enum WebAuthnPurpose {
  Registration = 'registration',
  SignIn = 'sign_in',
  Mfa = 'mfa',
  StepUp = 'step_up',
}

/** Un desafío de WebAuthn pendiente: vive cinco minutos y se usa una vez. */
export interface WebAuthnChallenge {
  readonly id: string;
  readonly challenge: string;
  readonly purpose: WebAuthnPurpose;
  /** Usuario dueño, salvo en el inicio de sesión sin usuario. */
  readonly userId?: string;
  readonly homeTenantId?: string;
}
