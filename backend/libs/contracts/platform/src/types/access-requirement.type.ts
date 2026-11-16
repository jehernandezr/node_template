import type { AccessKind } from '../enums/access-kind.enum.js';

/**
 * Requisito de acceso de una ruta. Los permisos y roles son valores de los enums
 * del contrato de identity; el kit los trata como texto para no depender de él.
 */
export interface AccessRequirement {
  readonly kind: AccessKind;
  /** Permisos que debe tener el usuario en el tenant activo (todos). */
  readonly permissions?: readonly string[];
  /** Roles de plataforma aceptados (cualquiera). */
  readonly platformRoles?: readonly string[];
  /** Edad máxima del último MFA, en minutos, para operaciones sensibles (step-up). */
  readonly mfaMaxAgeMinutes?: number;
  /** Funcionalidades del plan del tenant que la ruta exige (todas); valores de `PlanFeature`. */
  readonly features?: readonly string[];
  /**
   * Feature flags que deben estar encendidos para el usuario (todos); valores de
   * `FeatureFlag`. Un flag apagado responde como una ruta inexistente.
   */
  readonly flags?: readonly string[];
}
