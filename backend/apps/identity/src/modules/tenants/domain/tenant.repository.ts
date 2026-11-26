import type { Tenant } from './tenant.js';

/** Tenants in the tenant's shard. */
export abstract class TenantRepository {
  /**
   * Stores a new tenant.
   * @param tenant Tenant to store.
   */
  abstract insert(tenant: Tenant): Promise<void>;

  /**
   * Reads a tenant.
   * @param tenantId Tenant to read.
   * @returns The tenant, or `undefined`.
   */
  abstract find(tenantId: string): Promise<Tenant | undefined>;

  /**
   * Saves the changes of a tenant.
   * @param tenant Tenant read earlier and changed.
   * @throws OptimisticLockError if another write changed the tenant.
   */
  abstract update(tenant: Tenant): Promise<void>;

  /**
   * Deletes a tenant discarded during provisioning.
   * @param tenantId Tenant to delete.
   */
  abstract delete(tenantId: string): Promise<void>;
}
