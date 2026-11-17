import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ChangeTenantStatus } from '../application/change-tenant-status.use-case.js';
import { ListMyTenants } from '../application/list-my-tenants.use-case.js';
import { LocalTenantsFacade } from '../application/local-tenants.facade.js';
import { ProvisionTenant } from '../application/provision-tenant.use-case.js';
import { SeedRegionTenants } from '../application/seed-region-tenants.use-case.js';
import { TenantReader } from '../application/tenant-reader.js';
import { TenantsFacade } from '../application/tenants.facade.js';
import { UpdateTenant } from '../application/update-tenant.use-case.js';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { DirectoryTenantPlacement } from '../infrastructure/directory-tenant-placement.js';
import { KindEntitlementsProvider } from '../infrastructure/kind-entitlements-provider.js';
import { TenantLookupEntity } from '../infrastructure/persistence/entities/tenant-lookup.entity.js';
import { TenantEntity } from '../infrastructure/persistence/entities/tenant.entity.js';
import { TypeOrmTenantDirectory } from '../infrastructure/persistence/typeorm-tenant-directory.js';
import { TypeOrmTenantRepository } from '../infrastructure/persistence/typeorm-tenant.repository.js';
import { TenantsController } from './tenants.controller.js';
import { TenantsInternalOperations } from './tenants.internal-operations.js';

/** Tenants, slug, ubicación en shards y suspensión. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [TenantEntity],
      sharding: { key: ShardKey.Tenant },
    }),
    PersistenceModule.forFeature({
      entities: [TenantLookupEntity],
      catalog: true,
    }),
  ],
  controllers: [TenantsController],
  providers: [
    { provide: TenantRepository, useClass: TypeOrmTenantRepository },
    { provide: TenantDirectory, useClass: TypeOrmTenantDirectory },
    { provide: TenantPlacement, useClass: DirectoryTenantPlacement },
    { provide: EntitlementsProvider, useClass: KindEntitlementsProvider },
    TenantReader,
    ProvisionTenant,
    ChangeTenantStatus,
    UpdateTenant,
    ListMyTenants,
    SeedRegionTenants,
    { provide: TenantsFacade, useClass: LocalTenantsFacade },
    TenantsInternalOperations,
  ],
  exports: [TenantsFacade, EntitlementsProvider, SeedRegionTenants],
})
export class TenantsModule {}
