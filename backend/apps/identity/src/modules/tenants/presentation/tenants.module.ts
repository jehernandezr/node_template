import { Global, Module } from '@nestjs/common';
import { identityContract } from '@contracts/identity';
import { ConfigModule } from '@platform/config/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { SagaModule } from '@platform/saga/nest';
import { ShardKey } from '@platform/sharding';
import {
  TenantMoveConfig,
  TenantMoveTargets,
  TenantShardGroups,
  type TenantMoveSettings,
} from '@platform/tenant-move';
import { ApplyBillingStanding } from '../application/apply-billing-standing.use-case.js';
import { ChangeTenantStatus } from '../application/change-tenant-status.use-case.js';
import { ListMyTenants } from '../application/list-my-tenants.use-case.js';
import { LocalTenantsFacade } from '../application/local-tenants.facade.js';
import { ProvisionTenant } from '../application/provision-tenant.use-case.js';
import { RelocateTenant } from '../application/relocate-tenant.use-case.js';
import { SeedRegionTenants } from '../application/seed-region-tenants.use-case.js';
import { StartTenantOnboarding } from '../application/start-tenant-onboarding.use-case.js';
import { TenantOnboardingSaga } from '../application/tenant-onboarding.saga.js';
import { TenantDirectoryEntryFactory } from '../application/tenant-directory-entry.factory.js';
import { TenantReader } from '../application/tenant-reader.js';
import { TenantsFacade } from '../application/tenants.facade.js';
import { UpdateTenant } from '../application/update-tenant.use-case.js';
import { EntitlementsProvider } from '../domain/entitlements-provider.js';
import { FollowerDirectories } from '../domain/follower-directories.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { DirectoryTenantPlacement } from '../infrastructure/directory-tenant-placement.js';
import { InternalFollowerDirectories } from '../infrastructure/internal-follower-directories.js';
import { PlanEntitlementsProvider } from '../infrastructure/plan-entitlements-provider.js';
import { TenantLookupEntity } from '../infrastructure/persistence/entities/tenant-lookup.entity.js';
import { TenantEntity } from '../infrastructure/persistence/entities/tenant.entity.js';
import { TypeOrmTenantDirectory } from '../infrastructure/persistence/typeorm-tenant-directory.js';
import { TypeOrmTenantRepository } from '../infrastructure/persistence/typeorm-tenant.repository.js';
import { TenantsController } from './tenants.controller.js';
import { TenantsInternalOperations } from './tenants.internal-operations.js';

/**
 * Tenants, slug, shard placement (identity's and the one it records in the other services), saga-based creation and
 * suspension. Global only for its facade.
 */
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
    SagaModule.forFeature([TenantOnboardingSaga]),
    ConfigModule.forFeature(TenantMoveConfig),
  ],
  controllers: [TenantsController],
  providers: [
    { provide: TenantRepository, useClass: TypeOrmTenantRepository },
    { provide: TenantDirectory, useClass: TypeOrmTenantDirectory },
    { provide: TenantPlacement, useClass: DirectoryTenantPlacement },
    { provide: FollowerDirectories, useClass: InternalFollowerDirectories },
    {
      provide: TenantShardGroups,
      useFactory: (settings: TenantMoveSettings) =>
        new TenantShardGroups(
          identityContract.service,
          new TenantMoveTargets(settings.TENANT_MOVE_TARGETS),
        ),
      inject: [TenantMoveConfig.token],
    },
    TenantDirectoryEntryFactory,
    { provide: EntitlementsProvider, useClass: PlanEntitlementsProvider },
    TenantReader,
    ProvisionTenant,
    ChangeTenantStatus,
    ApplyBillingStanding,
    UpdateTenant,
    ListMyTenants,
    SeedRegionTenants,
    StartTenantOnboarding,
    RelocateTenant,
    { provide: TenantsFacade, useClass: LocalTenantsFacade },
    TenantsInternalOperations,
  ],
  exports: [
    TenantsFacade,
    EntitlementsProvider,
    SeedRegionTenants,
    ApplyBillingStanding,
  ],
})
export class TenantsModule {}
