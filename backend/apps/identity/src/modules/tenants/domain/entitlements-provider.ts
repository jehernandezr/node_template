import type { PlanFeature } from '@contracts/identity';
import type { TenantSnapshot } from './tenant-snapshot.js';

/** Funcionalidades del plan de un tenant, que viajan en su acceso y en sus tokens. */
export abstract class EntitlementsProvider {
  abstract features(tenant: TenantSnapshot): readonly PlanFeature[];
}
