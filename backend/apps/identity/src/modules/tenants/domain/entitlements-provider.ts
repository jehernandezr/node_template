import type { PlanFeature } from '@contracts/identity';
import type { TenantSnapshot } from './tenant-snapshot.js';

/** Plan features of a tenant, which travel in its access and its tokens. */
export abstract class EntitlementsProvider {
  abstract features(tenant: TenantSnapshot): readonly PlanFeature[];
}
