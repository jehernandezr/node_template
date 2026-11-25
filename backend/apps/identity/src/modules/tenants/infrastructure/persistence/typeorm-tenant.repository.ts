import { Injectable } from '@nestjs/common';
import type {
  PlanFeature,
  TenantKind,
  TenantLifecycle,
} from '@contracts/identity';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { Tenant } from '../../domain/tenant.js';
import { TenantRepository } from '../../domain/tenant.repository.js';
import { TenantEntity } from './entities/tenant.entity.js';

/** `TenantRepository` over `tenants` in the tenant's shard. */
@Injectable()
export class TypeOrmTenantRepository
  extends TenantIsolatedRepository
  implements TenantRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(tenant: Tenant): Promise<void> {
    await this.insertOwned(TenantEntity, this.toRow(tenant));
  }

  async find(tenantId: string): Promise<Tenant | undefined> {
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(TenantEntity, { id: tenantId, tenantId }),
    );
    return row === null ? undefined : this.toDomain(row);
  }

  async update(tenant: Tenant): Promise<void> {
    await this.updateOwned(TenantEntity, this.toRow(tenant));
  }

  async delete(tenantId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(TenantEntity, { id: tenantId, tenantId }),
    );
  }

  private toDomain(row: TenantEntity): Tenant {
    return Tenant.rehydrate({
      id: row.id,
      slug: row.slug,
      name: row.name,
      region: row.region,
      kind: row.kind as TenantKind,
      status: row.status as TenantLifecycle,
      ...(row.pinnedApiVersion === null
        ? {}
        : { pinnedApiVersion: row.pinnedApiVersion }),
      ...(row.planFeatures === null
        ? {}
        : { planFeatures: row.planFeatures as PlanFeature[] }),
      ...(row.planChangedAt === null
        ? {}
        : { planChangedAt: row.planChangedAt }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  private toRow(tenant: Tenant): TenantEntity {
    const state = tenant.snapshot();
    const row = new TenantEntity();
    row.id = state.id;
    row.tenantId = state.id;
    row.slug = state.slug;
    row.name = state.name;
    row.region = state.region;
    row.kind = state.kind;
    row.status = state.status;
    row.pinnedApiVersion = state.pinnedApiVersion ?? null;
    row.planFeatures =
      state.planFeatures === undefined ? null : [...state.planFeatures];
    row.planChangedAt = state.planChangedAt ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
