/** Result of evaluating the `AccessRequirement` of a route. */
export enum AccessOutcome {
  Allowed = 'allowed',
  /** A permission or a role is missing: `PLATFORM.AUTH.FORBIDDEN`. */
  Forbidden = 'forbidden',
  /** The tenant plan does not include a feature: `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`. */
  FeatureNotIncluded = 'feature_not_included',
  /** A route flag is disabled for the user: `PLATFORM.ACCESS.FLAG_DISABLED`. */
  FlagDisabled = 'flag_disabled',
  /** A recent second factor is missing: `IDENTITY.MFA.STEP_UP_REQUIRED`. */
  StepUpRequired = 'step_up_required',
}
