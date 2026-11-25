import { AccessKind } from '../enums/access-kind.enum.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';

/** Options of an authenticated route. */
export interface AuthenticatedAccessOptions {
  readonly permissions?: readonly string[];
  readonly platformRoles?: readonly string[];
  readonly mfaMaxAgeMinutes?: number;
  /** Features the tenant's plan must include (all of them). */
  readonly features?: readonly string[];
  /** Feature flags that must be on for the user (all of them). */
  readonly flags?: readonly string[];
}

/** Builders of `AccessRequirement`. */
export const Access = {
  /** Route without a session. */
  public(): AccessRequirement {
    return Object.freeze({ kind: AccessKind.Public });
  },
  /** Route with an access token and, optionally, permissions, roles, plan features, flags or recent MFA. */
  authenticated(options: AuthenticatedAccessOptions = {}): AccessRequirement {
    const requirement: {
      kind: AccessKind;
      permissions?: readonly string[];
      platformRoles?: readonly string[];
      mfaMaxAgeMinutes?: number;
      features?: readonly string[];
      flags?: readonly string[];
    } = { kind: AccessKind.Authenticated };
    if (options.permissions?.length) {
      requirement.permissions = Object.freeze([...options.permissions]);
    }
    if (options.platformRoles?.length) {
      requirement.platformRoles = Object.freeze([...options.platformRoles]);
    }
    if (options.features?.length) {
      requirement.features = Object.freeze([...options.features]);
    }
    if (options.flags?.length) {
      requirement.flags = Object.freeze([...options.flags]);
    }
    if (options.mfaMaxAgeMinutes !== undefined) {
      requirement.mfaMaxAgeMinutes = options.mfaMaxAgeMinutes;
    }
    return Object.freeze(requirement);
  },
} as const;
