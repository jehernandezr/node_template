import { AccessKind } from '../enums/access-kind.enum.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';

/** Opciones de una ruta autenticada. */
export interface AuthenticatedAccessOptions {
  readonly permissions?: readonly string[];
  readonly platformRoles?: readonly string[];
  readonly mfaMaxAgeMinutes?: number;
}

/** Constructores de `AccessRequirement`. */
export const Access = {
  /** Ruta sin sesión. */
  public(): AccessRequirement {
    return Object.freeze({ kind: AccessKind.Public });
  },
  /** Ruta con access token y, opcionalmente, permisos, roles o MFA reciente. */
  authenticated(options: AuthenticatedAccessOptions = {}): AccessRequirement {
    const requirement: {
      kind: AccessKind;
      permissions?: readonly string[];
      platformRoles?: readonly string[];
      mfaMaxAgeMinutes?: number;
    } = { kind: AccessKind.Authenticated };
    if (options.permissions?.length) {
      requirement.permissions = Object.freeze([...options.permissions]);
    }
    if (options.platformRoles?.length) {
      requirement.platformRoles = Object.freeze([...options.platformRoles]);
    }
    if (options.mfaMaxAgeMinutes !== undefined) {
      requirement.mfaMaxAgeMinutes = options.mfaMaxAgeMinutes;
    }
    return Object.freeze(requirement);
  },
} as const;
