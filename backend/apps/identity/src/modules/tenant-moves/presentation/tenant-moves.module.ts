import { Module } from '@nestjs/common';
import { IdentityTenantMoveOperations } from '@contracts/identity';
import { ConfigModule } from '@platform/config/nest';
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
import { TenantMovesCoreModule } from './tenant-moves-core.module.js';
import { TenantMovesInternalOperations } from './tenant-moves.internal-operations.js';

import { ApiKeysModule } from '../../api-keys/module.js';
import { PasskeysCoreModule } from '../../passkeys/module.js';
import { SagasModule } from '../../sagas/module.js';
import { TenantsCoreModule } from '../../tenants/module.js';
import { UsersCoreModule } from '../../users/module.js';

/**
 * Tenant moves: the `MoveTenant` saga, its log, the source cleanup and identity's move
 * operations. The listener of those operations lives in `TenantMoveModule`, which imports the modules it needs.
 */
@Module({
  imports: [
    TenantMovesCoreModule,
    SagasModule,
    TenantsCoreModule,
    ConfigModule.forFeature(TenantMoveConfig),
    SagaModule.forFeature([MoveTenantSaga]),
    TenantMoveModule.forFeature({
      operations: IdentityTenantMoveOperations,
      manifest: IdentityTenantMoveManifest,
      listener: IdentityTenantMoveListener,
      imports: [
        TenantMovesCoreModule,
        TenantsCoreModule,
        UsersCoreModule,
        PasskeysCoreModule,
        ApiKeysModule,
      ],
    }),
  ],
  providers: [
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
})
export class TenantMovesModule {}
