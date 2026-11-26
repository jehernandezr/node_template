import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, TenantLifecycle } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';
import { RelocateTenant } from './relocate-tenant.use-case.js';
import { TenantReader } from './tenant-reader.js';
import { TenantsFacade } from './tenants.facade.js';

/** `TenantsFacade` for callers in the same process: each method runs the module's use case or repository. */
@Injectable()
export class LocalTenantsFacade extends TenantsFacade {
  constructor(
    private readonly reader: TenantReader,
    private readonly relocation: RelocateTenant,
  ) {
    super();
  }

  relocate(tenantId: string, region: string): Promise<void> {
    return this.relocation.execute(tenantId, region);
  }

  get(tenantId: string): Promise<TenantSnapshot> {
    return this.reader.get(tenantId);
  }

  async assertActive(tenantId: string): Promise<void> {
    const tenant = await this.reader.get(tenantId);
    if (tenant.status !== TenantLifecycle.Active) {
      throw new IdentityError(IdentityErrorCode.TenantSuspended);
    }
  }
}
