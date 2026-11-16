/** Resultado de evaluar el `AccessRequirement` de una ruta. */
export enum AccessOutcome {
  Allowed = 'allowed',
  /** Falta un permiso o un rol: `PLATFORM.AUTH.FORBIDDEN`. */
  Forbidden = 'forbidden',
  /** Falta un segundo factor reciente: `IDENTITY.MFA.STEP_UP_REQUIRED`. */
  StepUpRequired = 'step_up_required',
}
