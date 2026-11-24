import { Global, Module } from '@nestjs/common';
import { IdentityTenantMoveOperations } from '@contracts/identity';
import { ConfigModule } from '@platform/config/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { SagaModule } from '@platform/saga/nest';
import {
  TenantMoveConfig,
  TenantMoveTargets,
  type TenantMoveSettings,
} from '@platform/tenant-move';
import { TenantMoveModule } from '@platform/tenant-move/nest';
import { IdentityTenantMoveManifest } from '../../../database/identity-tenant-move.manifest.js';
import { FinishTenantMove } from '../application/finish-tenant-move.use-case.js';
import { IdentityTenantMoveListener } from '../application/identity-tenant-move.listener.js';
import { MoveTenantSaga } from '../application/move-tenant.saga.js';
import { StartTenantMove } from '../application/start-tenant-move.use-case.js';
import { TenantMoveCleanupJob } from '../application/tenant-move-cleanup.job.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';
import { TenantMoveEntity } from '../infrastructure/persistence/entities/tenant-move.entity.js';
import { TypeOrmTenantMoveLog } from '../infrastructure/persistence/typeorm-tenant-move-log.js';
import { TenantMovesInternalOperations } from './tenant-moves.internal-operations.js';

/**
 * Traslado de tenants: la saga `MoveTenant`, su bitácora, la limpieza del origen y las operaciones de traslado de
 * identity. Es global para que el oyente de esas operaciones, que vive en `TenantMoveModule`, alcance la bitácora.
 */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [TenantMoveEntity],
      catalog: true,
    }),
    ConfigModule.forFeature(TenantMoveConfig),
    SagaModule.forFeature([MoveTenantSaga]),
    TenantMoveModule.forFeature({
      operations: IdentityTenantMoveOperations,
      manifest: IdentityTenantMoveManifest,
      listener: IdentityTenantMoveListener,
    }),
  ],
  providers: [
    { provide: TenantMoveLog, useClass: TypeOrmTenantMoveLog },
    {
      provide: TenantMoveTargets,
      useFactory: (settings: TenantMoveSettings) =>
        new TenantMoveTargets(settings.TENANT_MOVE_TARGETS),
      inject: [TenantMoveConfig.token],
    },
    StartTenantMove,
    FinishTenantMove,
    TenantMovesInternalOperations,
    TenantMoveCleanupJob,
  ],
  exports: [TenantMoveLog],
})
export class TenantMovesModule {}
