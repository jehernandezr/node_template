import { SagaPostgresModule } from '../saga-postgres.module.js';
import { ShardedSagaScopes } from '../../saga/sharded-saga-scopes.js';
import { TypeOrmSagaStore } from '../../saga/typeorm-saga-store.js';

describe('SagaPostgresModule', () => {
  it('exporta el almacén y los ámbitos de sagas', () => {
    const exported: unknown[] = Reflect.getMetadata(
      'exports',
      SagaPostgresModule,
    );

    expect(exported).toEqual(
      expect.arrayContaining([TypeOrmSagaStore, ShardedSagaScopes]),
    );
    expect(exported).toHaveLength(2);
  });

  it('es global, como SagaModule', () => {
    expect(Reflect.getMetadata('__module:global__', SagaPostgresModule)).toBe(
      true,
    );
  });
});
