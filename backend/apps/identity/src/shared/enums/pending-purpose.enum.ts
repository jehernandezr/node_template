/** Para qué se abrió una autenticación pendiente. */
export enum PendingPurpose {
  /** Inicio de sesión que falta completar con un segundo factor. */
  SignIn = 'sign_in',
  /** Paso adicional de una sesión ya abierta. */
  StepUp = 'step_up',
  /** Recuperación del segundo factor sin dispositivo. */
  Recovery = 'recovery',
}
