import { TenantLifecycle } from '@contracts/identity';
import { TenantsFacade } from '../../application/tenants.facade.js';
import type { TenantSnapshot } from '../../domain/tenant-snapshot.js';

/** Tenants en memoria. */
export class InMemoryTenantsFacade extends TenantsFacade {
  private readonly tenants = new Map<string, TenantSnapshot>();

  add(tenant: TenantSnapshot): this {
    this.tenants.set(tenant.id, tenant);
    return this;
  }

  async get(tenantId: string): Promise<TenantSnapshot> {
    const tenant = this.tenants.get(tenantId);
    if (tenant === undefined) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  async assertActive(tenantId: string): Promise<void> {
    const tenant = await this.get(tenantId);
    if (tenant.status !== TenantLifecycle.Active) {
      throw new Error('Tenant not active');
    }
  }

  async relocate(tenantId: string, region: string): Promise<void> {
    this.tenants.set(tenantId, { ...(await this.get(tenantId)), region });
  }
}
