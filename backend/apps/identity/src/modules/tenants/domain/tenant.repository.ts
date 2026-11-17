import type { Tenant } from './tenant.js';

/** Tenants en el shard del tenant. */
export abstract class TenantRepository {
  abstract insert(tenant: Tenant): Promise<void>;

  abstract find(tenantId: string): Promise<Tenant | undefined>;

  /** @throws OptimisticLockError si otra escritura cambió el tenant. */
  abstract update(tenant: Tenant): Promise<void>;

  abstract delete(tenantId: string): Promise<void>;
}
