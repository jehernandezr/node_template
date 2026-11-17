import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, TenantLifecycle } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';
import { TenantReader } from './tenant-reader.js';
import { TenantsFacade } from './tenants.facade.js';

/** `TenantsFacade` dentro del proceso. */
@Injectable()
export class LocalTenantsFacade extends TenantsFacade {
  constructor(private readonly reader: TenantReader) {
    super();
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
