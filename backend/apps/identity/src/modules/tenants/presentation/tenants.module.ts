import { Module } from '@nestjs/common';
import { identityContract } from '@contracts/identity';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { ConfigModule } from '@platform/config/nest';
import { SagaModule } from '@platform/saga/nest';
import { LeastLoadedPlacementPolicy, TenantPlacer } from '@platform/sharding';
import {
  TenantMoveConfig,
  TenantMoveTargets,
  TenantShardGroups,
  type TenantMoveSettings,
} from '@platform/tenant-move';
import { ApplyBillingStanding } from '../application/apply-billing-standing.use-case.js';
import { ChangeTenantStatus } from '../application/change-tenant-status.use-case.js';
import { ListMyTenants } from '../application/list-my-tenants.use-case.js';
import { ProvisionTenant } from '../application/provision-tenant.use-case.js';
import { SeedRegionTenants } from '../application/seed-region-tenants.use-case.js';
import { StartTenantOnboarding } from '../application/start-tenant-onboarding.use-case.js';
import { TenantOnboardingSaga } from '../application/tenant-onboarding.saga.js';
import { TenantDirectoryEntryFactory } from '../application/tenant-directory-entry.factory.js';
import { UpdateTenant } from '../application/update-tenant.use-case.js';
import { FollowerDirectories } from '../domain/follower-directories.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { DirectoryTenantPlacement } from '../infrastructure/directory-tenant-placement.js';
import { InternalFollowerDirectories } from '../infrastructure/internal-follower-directories.js';
import { BillingStandingConsumer } from './billing-standing.consumer.js';
import { TenantsController } from './tenants.controller.js';
import { TenantsInternalOperations } from './tenants.internal-operations.js';

import { TenantsCoreModule } from './tenants-core.module.js';
import { AccessCoreModule } from '../../access/module.js';
import { SagasModule } from '../../sagas/module.js';
import { UsersCoreModule } from '../../users/module.js';

/**
 * Tenants, slug, shard placement (identity's and the one it records in the other services), saga-based creation and
 * suspension.
 */
@Module({
  imports: [
    TenantsCoreModule,
    AccessCoreModule,
    SagasModule,
    UsersCoreModule,
    SagaModule.forFeature([TenantOnboardingSaga]),
    ConfigModule.forFeature(TenantMoveConfig),
  ],
  controllers: [TenantsController],
  providers: [
    {
      provide: TenantPlacer,
      useFactory: (directory: TypeOrmDirectoryStore) =>
        new TenantPlacer(new LeastLoadedPlacementPolicy(), directory),
      inject: [TypeOrmDirectoryStore],
    },
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
    ProvisionTenant,
    ChangeTenantStatus,
    ApplyBillingStanding,
    UpdateTenant,
    ListMyTenants,
    SeedRegionTenants,
    StartTenantOnboarding,
    TenantsInternalOperations,
    BillingStandingConsumer,
  ],
})
export class TenantsModule {}
