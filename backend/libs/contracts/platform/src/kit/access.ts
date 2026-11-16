import { AccessKind } from '../enums/access-kind.enum.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';

/** Opciones de una ruta autenticada. */
export interface AuthenticatedAccessOptions {
  readonly permissions?: readonly string[];
  readonly platformRoles?: readonly string[];
  readonly mfaMaxAgeMinutes?: number;
  /** Funcionalidades que el plan del tenant debe incluir (todas). */
  readonly features?: readonly string[];
  /** Feature flags que deben estar encendidos para el usuario (todos). */
  readonly flags?: readonly string[];
}

/** Constructores de `AccessRequirement`. */
export const Access = {
  /** Ruta sin sesión. */
  public(): AccessRequirement {
    return Object.freeze({ kind: AccessKind.Public });
  },
  /** Ruta con access token y, opcionalmente, permisos, roles, funcionalidades del plan, flags o MFA reciente. */
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
