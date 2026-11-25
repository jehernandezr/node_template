import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/** What `tenants` offers to the other modules. */
export abstract class TenantsFacade {
  /** @throws DomainError `IDENTITY.TENANT.NOT_FOUND` if it does not exist. */
  abstract get(tenantId: string): Promise<TenantSnapshot>;
  /** @throws DomainError `IDENTITY.TENANT.SUSPENDED` if the tenant is not active. */
  abstract assertActive(tenantId: string): Promise<void>;
  /** Points the slug index to the tenant's new region after moving it. Idempotent. */
  abstract relocate(tenantId: string, region: string): Promise<void>;
}
