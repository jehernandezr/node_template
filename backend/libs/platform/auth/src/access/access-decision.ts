import type { AccessOutcome } from './access-outcome.enum.js';

/** Decision of the access evaluator. `Forbidden`, `FeatureNotIncluded` and `StepUpRequired` state what was missing, without user data. */
export type AccessDecision =
  | { readonly outcome: AccessOutcome.Allowed }
  | {
      readonly outcome: AccessOutcome.Forbidden;
      /** Permissions or platform roles the actor does not have. */
      readonly missing: readonly string[];
    }
  | {
      readonly outcome: AccessOutcome.FeatureNotIncluded;
      /** Plan features the tenant does not have. */
      readonly missing: readonly string[];
    }
  | { readonly outcome: AccessOutcome.FlagDisabled }
  | { readonly outcome: AccessOutcome.StepUpRequired };
