import type { DataSource, QueryRunner, ReplicationMode } from 'typeorm';
import { ShardKey, ShardingErrorCode } from '@platform/sharding';
import { DataSourceFactory } from '../ports/data-source-factory.js';
import type { DatabaseTarget } from '../model/database-target.js';
import { ManagerIntent } from '../model/manager-intent.enum.js';
import { PersistenceFeature } from '../persistence-feature.js';
import { EntityManagerProvider } from '../entity-manager-provider.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { ShardResolver } from '../shard-resolver.js';
import { TypeOrmTransactionManager } from '../typeorm-transaction-manager.js';
import { StubDataSource } from './utils/stub-data-source.js';
import { StubShardedLayer } from './utils/stub-sharded-layer.js';

const FEATURE = new PersistenceFeature({ key: ShardKey.Tenant });
const TENANT_B = StubShardedLayer.TENANT_B;

/** `DataSource` that records the mode of each `QueryRunner` it creates. */
class ModeRecordingDataSource extends StubDataSource {
  readonly modes: ReplicationMode[] = [];

  override createQueryRunner(mode: ReplicationMode = 'master'): QueryRunner {
    this.modes.push(mode);
    return super.createQueryRunner(mode);
  }
}

class ModeRecordingFactory extends DataSourceFactory {
  readonly created: ModeRecordingDataSource[] = [];

  override create(target: DatabaseTarget): DataSource {
    const dataSource = new ModeRecordingDataSource(target.database);
    this.created.push(dataSource);
    return dataSource;
  }
}

/** Builds the provider over a `DataSource` that records the modes, with the same routing layer. */
function buildProvider(layer: StubShardedLayer): {
  provider: EntityManagerProvider;
  transactions: TypeOrmTransactionManager;
  factory: ModeRecordingFactory;
} {
  const factory = new ModeRecordingFactory();
  const sources = new ShardDataSources(factory, layer.endpoints, layer.clock, {
    idleTtlMs: 60_000,
  });
  const resolver = new ShardResolver(
    layer.router,
    sources,
    layer.scope,
    layer.context,
    {
      requireScope: false,
    },
  );
  const transactions = new TypeOrmTransactionManager(
    resolver,
    FEATURE,
    layer.context,
    layer.logger,
  );
  return {
    provider: new EntityManagerProvider(resolver, transactions),
    transactions,
    factory,
  };
}

describe('EntityManagerProvider', () => {
  let layer: StubShardedLayer;

  beforeEach(() => {
    layer = new StubShardedLayer();
    layer.asTenant(StubShardedLayer.TENANT_A);
  });

  describe('for a read outside a transaction', () => {
    it('uses a replica runner and releases it', async () => {
      const { provider, factory } = buildProvider(layer);

      const result = await provider.run(
        { feature: FEATURE, intent: ManagerIntent.Read },
        () => Promise.resolve('rows'),
      );

      expect(result).toBe('rows');
      expect(factory.created[0].modes).toEqual(['slave']);
      expect(factory.created[0].runners[0].calls).toEqual(['release']);
    });
  });

  describe('for a read from the primary outside a transaction', () => {
    it('uses a primary runner', async () => {
      const { provider, factory } = buildProvider(layer);

      await provider.run(
        { feature: FEATURE, intent: ManagerIntent.ReadPrimary },
        () => Promise.resolve(),
      );

      expect(factory.created[0].modes).toEqual(['master']);
    });
  });

  describe('for a write', () => {
    it('opens a transaction on the shard', async () => {
      const { provider, factory } = buildProvider(layer);

      await provider.run(
        { feature: FEATURE, intent: ManagerIntent.Write },
        () => Promise.resolve(),
      );

      expect(factory.created[0].runners[0].calls).toContain('begin');
    });
  });

  describe('for a read inside a transaction', () => {
    it('uses the manager of the transaction and opens no runner', async () => {
      const { provider, transactions, factory } = buildProvider(layer);

      const sameManager = await transactions.runInTransaction(async (uow) => {
        const manager = await provider.run(
          { feature: FEATURE, intent: ManagerIntent.Read },
          (found) => Promise.resolve(found),
        );
        return manager === uow.manager;
      });

      expect(sameManager).toBe(true);
      expect(factory.created[0].modes).toEqual(['master']);
    });
  });

  describe('for a read with a scope of another tenant inside a transaction', () => {
    it('rejects with CROSS_SHARD_TX', async () => {
      const { provider, transactions } = buildProvider(layer);

      await expect(
        transactions.runInTransaction(() =>
          layer.scope.run(
            { tenantId: TENANT_B, keyKind: ShardKey.Tenant },
            () =>
              provider.run(
                { feature: FEATURE, intent: ManagerIntent.Read },
                () => Promise.resolve(),
              ),
          ),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.CrossShardTransaction,
      });
    });
  });
});
