import type {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '@contracts/identity';

/** Acceso efectivo de un usuario en un tenant, con la versión de permisos con que se calculó. */
export interface AccessGrant {
  readonly permissions: readonly Permission[];
  readonly platformRoles: readonly PlatformRole[];
  readonly features: readonly PlanFeature[];
  readonly flags: readonly FeatureFlag[];
  /** `<versión del tenant>.<versión del usuario>`, el mismo formato del claim `pv`. */
  readonly permissionVersion: string;
}
