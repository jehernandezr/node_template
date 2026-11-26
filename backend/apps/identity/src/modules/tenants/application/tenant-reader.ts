import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { TenantSnapshot } from '../domain/tenant-snapshot.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { TenantSummaryView } from './tenant-summary-view.js';

/** Reads tenants from their shard. */
@Injectable()
export class TenantReader {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly scopes: ShardScopes,
  ) {}

  /** @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` if it does not exist. */
  async get(tenantId: string): Promise<TenantSnapshot> {
    const tenant = await this.find(tenantId);
    if (tenant === undefined) {
      throw new IdentityError(IdentityErrorCode.TenantNotFound);
    }
    return tenant;
  }

  /** A tenant without a placement in the directory does not exist yet. */
  async find(tenantId: string): Promise<TenantSnapshot | undefined> {
    try {
      const tenant = await this.scopes.inTenantShard(tenantId, () =>
        this.tenants.find(tenantId),
      );
      return tenant === undefined
        ? undefined
        : TenantSummaryView.snapshot(tenant.snapshot());
    } catch (error) {
      if (
        error instanceof ShardingError &&
        error.code === ShardingErrorCode.UnknownTenant
      ) {
        return undefined;
      }
      throw error;
    }
  }
}
