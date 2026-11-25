import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { IdentitySagas } from '../application/identity-sagas.js';
import { SagaDirectory } from '../domain/saga-directory.js';
import { SagaDirectoryEntity } from '../infrastructure/persistence/entities/saga-directory.entity.js';
import { TypeOrmSagaDirectory } from '../infrastructure/persistence/typeorm-saga-directory.js';
import { SagasController } from './sagas.controller.js';

/** Starting and querying identity's sagas. Global for the modules that start them. */
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
