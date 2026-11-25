import { SagaPostgresModule } from '../saga-postgres.module.js';
import { ShardedSagaScopes } from '../../saga/sharded-saga-scopes.js';
import { TypeOrmSagaStore } from '../../saga/typeorm-saga-store.js';

describe('SagaPostgresModule', () => {
  it('exports the store and the saga scopes', () => {
    const exported: unknown[] = Reflect.getMetadata(
      'exports',
      SagaPostgresModule,
    );

    expect(exported).toEqual(
      expect.arrayContaining([TypeOrmSagaStore, ShardedSagaScopes]),
    );
    expect(exported).toHaveLength(2);
  });

  it('is global, like SagaModule', () => {
    expect(Reflect.getMetadata('__module:global__', SagaPostgresModule)).toBe(
      true,
    );
  });
});
