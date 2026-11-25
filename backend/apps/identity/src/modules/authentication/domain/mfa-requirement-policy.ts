/** What is known about a sign-in whose password is already verified. */
export interface MfaRequirementFacts {
  /** The request's device is registered for the user. */
  readonly deviceRecognized: boolean;
  /** Whether the user administers their default tenant or has platform roles. */
  readonly privileged: boolean;
  /** The account is in protected mode due to failures from several origins. */
  readonly protectedMode: boolean;
}

/** Decides whether a sign-in needs a second factor. */
export class MfaRequirementPolicy {
  requiresSecondFactor(facts: MfaRequirementFacts): boolean {
    return !facts.deviceRecognized || facts.privileged || facts.protectedMode;
  }
}
