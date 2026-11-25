import type {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '@contracts/identity';

/** Effective access of a user in a tenant, with the permissions version it was computed with. */
export interface AccessGrant {
  readonly permissions: readonly Permission[];
  readonly platformRoles: readonly PlatformRole[];
  readonly features: readonly PlanFeature[];
  readonly flags: readonly FeatureFlag[];
  /** `<tenant version>.<user version>`, the same format as the `pv` claim. */
  readonly permissionVersion: string;
}
