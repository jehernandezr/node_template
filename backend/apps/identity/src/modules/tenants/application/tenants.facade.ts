import type { TenantSnapshot } from '../domain/tenant-snapshot.js';

/** Lo que `tenants` ofrece a los otros módulos. */
export abstract class TenantsFacade {
  /** @throws DomainError `IDENTITY.TENANT.NOT_FOUND` si no existe. */
  abstract get(tenantId: string): Promise<TenantSnapshot>;
  /** @throws DomainError `IDENTITY.TENANT.SUSPENDED` si el tenant no está activo. */
  abstract assertActive(tenantId: string): Promise<void>;
  /** Apunta el índice de slugs a la región nueva del tenant después de trasladarlo. Idempotente. */
  abstract relocate(tenantId: string, region: string): Promise<void>;
}
