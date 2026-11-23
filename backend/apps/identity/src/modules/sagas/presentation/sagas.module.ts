import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { IdentitySagas } from '../application/identity-sagas.js';
import { SagaDirectory } from '../domain/saga-directory.js';
import { SagaDirectoryEntity } from '../infrastructure/persistence/entities/saga-directory.entity.js';
import { TypeOrmSagaDirectory } from '../infrastructure/persistence/typeorm-saga-directory.js';
import { SagasController } from './sagas.controller.js';

/** Arranque y consulta de las sagas de identity. Global para los módulos que las arrancan. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [SagaDirectoryEntity],
      catalog: true,
    }),
  ],
  controllers: [SagasController],
  providers: [
    { provide: SagaDirectory, useClass: TypeOrmSagaDirectory },
    IdentitySagas,
  ],
  exports: [IdentitySagas],
})
export class SagasModule {}
