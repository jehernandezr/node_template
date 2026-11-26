import type { PlanFeature } from '@contracts/identity';
import type { TenantSnapshot } from './tenant-snapshot.js';

/** Plan features of a tenant, which travel in its access and its tokens. */
export abstract class EntitlementsProvider {
  /**
   * Reads the plan features of a tenant.
   * @param tenant Tenant to read.
   * @returns Its features.
   */
  abstract features(tenant: TenantSnapshot): readonly PlanFeature[];
}
