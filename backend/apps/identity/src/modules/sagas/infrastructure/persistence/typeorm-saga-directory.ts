import { Injectable } from '@nestjs/common';
import type { IdentitySaga } from '@contracts/identity';
import { CatalogDataSource } from '@platform/persistence';
import { SagaDirectory, type SagaEntry } from '../../domain/saga-directory.js';
import { SagaDirectoryEntity } from './entities/saga-directory.entity.js';

/** `SagaDirectory` sobre `identity_sagas` del catálogo. Anotar dos veces la misma saga no cambia nada. */
@Injectable()
export class TypeOrmSagaDirectory extends SagaDirectory {
  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  async record(entry: SagaEntry): Promise<void> {
    const dataSource = await this.catalog.get();
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(SagaDirectoryEntity)
      .values({ ...entry })
      .orIgnore()
      .execute();
  }

  async find(sagaId: string): Promise<SagaEntry | undefined> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner('master');
    try {
      const row = await runner.manager.findOneBy(SagaDirectoryEntity, {
        sagaId,
      });
      return row === null
        ? undefined
        : {
            sagaId: row.sagaId,
            saga: row.saga as IdentitySaga,
            tenantId: row.tenantId,
            requestedBy: row.requestedBy,
          };
    } finally {
      await runner.release();
    }
  }
}
