import type { AccessKind } from '../enums/access-kind.enum.js';

/**
 * Access requirement of a route. Permissions and roles are values of the enums
 * of the identity contract; the kit treats them as text to avoid depending on it.
 */
export interface AccessRequirement {
  readonly kind: AccessKind;
  /** Permissions the user must have in the active tenant (all of them). */
  readonly permissions?: readonly string[];
  /** Accepted platform roles (any of them). */
  readonly platformRoles?: readonly string[];
  /** Maximum age of the last MFA, in minutes, for sensitive operations (step-up). */
  readonly mfaMaxAgeMinutes?: number;
  /** Tenant plan features the route requires (all of them); values of `PlanFeature`. */
  readonly features?: readonly string[];
  /**
   * Feature flags that must be on for the user (all of them); values of
   * `FeatureFlag`. A flag that is off responds like a nonexistent route.
   */
  readonly flags?: readonly string[];
}
