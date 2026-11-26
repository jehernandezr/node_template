import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LocalTenantsFacade } from '../application/local-tenants.facade.js';
import { RelocateTenant } from '../application/relocate-tenant.use-case.js';
import { TenantReader } from '../application/tenant-reader.js';
import { TenantsFacade } from '../application/tenants.facade.js';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { PlanEntitlementsProvider } from '../infrastructure/plan-entitlements-provider.js';
import { TenantLookupEntity } from '../infrastructure/persistence/entities/tenant-lookup.entity.js';
import { TenantEntity } from '../infrastructure/persistence/entities/tenant.entity.js';
import { TypeOrmTenantDirectory } from '../infrastructure/persistence/typeorm-tenant-directory.js';
import { TypeOrmTenantRepository } from '../infrastructure/persistence/typeorm-tenant.repository.js';

/**
 * The part of `Tenants` other modules depend on: its facade and what the facade needs, with the repositories and services its entry module also uses.
 */
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
  providers: [
    { provide: TenantRepository, useClass: TypeOrmTenantRepository },
    { provide: TenantDirectory, useClass: TypeOrmTenantDirectory },
    { provide: EntitlementsProvider, useClass: PlanEntitlementsProvider },
    TenantReader,
    RelocateTenant,
    { provide: TenantsFacade, useClass: LocalTenantsFacade },
  ],
  exports: [
    TenantRepository,
    TenantDirectory,
    EntitlementsProvider,
    TenantReader,
    RelocateTenant,
    TenantsFacade,
  ],
})
export class TenantsCoreModule {}
