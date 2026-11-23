/** Resultado de evaluar el `AccessRequirement` de una ruta. */
export enum AccessOutcome {
  Allowed = 'allowed',
  /** Falta un permiso o un rol: `PLATFORM.AUTH.FORBIDDEN`. */
  Forbidden = 'forbidden',
  /** El plan del tenant no incluye una funcionalidad: `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`. */
  FeatureNotIncluded = 'feature_not_included',
  /** Un flag de la ruta está apagado para el usuario: `PLATFORM.ACCESS.FLAG_DISABLED`. */
  FlagDisabled = 'flag_disabled',
  /** Falta un segundo factor reciente: `IDENTITY.MFA.STEP_UP_REQUIRED`. */
  StepUpRequired = 'step_up_required',
}
