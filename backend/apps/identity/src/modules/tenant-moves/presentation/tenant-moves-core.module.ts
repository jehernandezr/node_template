import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { TenantMoveLog } from '../domain/tenant-move-log.js';
import { TenantMoveEntity } from '../infrastructure/persistence/entities/tenant-move.entity.js';
import { TypeOrmTenantMoveLog } from '../infrastructure/persistence/typeorm-tenant-move-log.js';

/** The log of identity's tenant moves, shared by the move operations, their listener and the `MoveTenant` saga steps. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [TenantMoveEntity],
      catalog: true,
    }),
  ],
  providers: [{ provide: TenantMoveLog, useClass: TypeOrmTenantMoveLog }],
  exports: [TenantMoveLog],
})
export class TenantMovesCoreModule {}
