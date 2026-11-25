import type { Tenant } from './tenant.js';

/** Tenants in the tenant's shard. */
export abstract class TenantRepository {
  abstract insert(tenant: Tenant): Promise<void>;

  abstract find(tenantId: string): Promise<Tenant | undefined>;

  /** @throws OptimisticLockError if another write changed the tenant. */
  abstract update(tenant: Tenant): Promise<void>;

  abstract delete(tenantId: string): Promise<void>;
}
