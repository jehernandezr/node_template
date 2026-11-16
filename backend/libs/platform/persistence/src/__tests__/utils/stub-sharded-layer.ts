import { ActorType } from '@platform/observability';
import { FixedClock } from '@platform/kernel/test-utils';
import { ShardKey, ShardRouter } from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
  TestTenants,
} from '@platform/sharding/test-utils';
import { TenantStatus } from '@platform/sharding';
import { ShardDataSources } from '../../shard-data-sources.js';
import { ShardResolver } from '../../shard-resolver.js';
import { ShardScope } from '../../shard-scope.js';
import { EntityManagerProvider } from '../../entity-manager-provider.js';
import { PersistenceFeature } from '../../persistence-feature.js';
import { TypeOrmTransactionManager } from '../../typeorm-transaction-manager.js';
import { FakeDataSourceFactory } from './fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './fake-instance-endpoint-resolver.js';
import { FixedPersistenceContextProvider } from './fixed-persistence-context-provider.js';
import { RecordingLogger } from './recording-logger.js';
import type { StubDataSource } from './stub-data-source.js';
import { ProbeEntity } from './probe.entity.js';

/**
 * Capa de sharding cableada a mano sobre `DataSource` sin base: dos tenants en dos shards lógicos
 * de una misma instancia, para probar ruteo, transacciones y repositorios sin PostgreSQL.
 */
export class StubShardedLayer {
  static readonly TENANT_A = TestTenants.One;
  static readonly TENANT_B = TestTenants.Two;
  static readonly SHARD_A = 'stub_shard_a';
  static readonly SHARD_B = 'stub_shard_b';
  static readonly INSTANCE = 'stub-instance';

  readonly directory = new InMemoryDirectoryStore();
  readonly router: ShardRouter;
  readonly clock = new FixedClock();
  readonly factory = new FakeDataSourceFactory([ProbeEntity]);
  readonly endpoints = new FakeInstanceEndpointResolver();
  readonly sources: ShardDataSources;
  readonly scope: ShardScope;
  readonly context = new FixedPersistenceContextProvider();
  readonly resolver: ShardResolver;
  readonly logger = new RecordingLogger();
  readonly transactions: TypeOrmTransactionManager;
  readonly provider: EntityManagerProvider;

  constructor(requireScope = false) {
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(StubShardedLayer.TENANT_A)
        .withRegion('eu')
        .withShardGroup(StubShardedLayer.SHARD_A)
        .withStatus(TenantStatus.Active)
        .build(),
    );
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(StubShardedLayer.TENANT_B)
        .withRegion('eu')
        .withShardGroup(StubShardedLayer.SHARD_B)
        .withStatus(TenantStatus.Active)
        .build(),
    );
    this.directory.setInstance(
      StubShardedLayer.SHARD_A,
      StubShardedLayer.INSTANCE,
    );
    this.directory.setInstance(
      StubShardedLayer.SHARD_B,
      StubShardedLayer.INSTANCE,
    );

    this.router = new ShardRouter({ directory: this.directory });
    this.sources = new ShardDataSources(
      this.factory,
      this.endpoints,
      this.clock,
      {
        idleTtlMs: 60_000,
      },
    );
    this.scope = new ShardScope(this.router);
    this.resolver = new ShardResolver(
      this.router,
      this.sources,
      this.scope,
      this.context,
      {
        requireScope,
      },
    );
    this.transactions = new TypeOrmTransactionManager(
      this.resolver,
      new PersistenceFeature({ key: ShardKey.Tenant }),
      this.context,
      this.logger,
    );
    this.provider = new EntityManagerProvider(this.resolver, this.transactions);
  }

  /** Fija el contexto de la petición como un usuario del tenant dado. */
  asTenant(tenantId: string, userId?: string): void {
    this.context.set({
      tenantId,
      userId,
      actorId: 'stub-actor',
      actorType: ActorType.User,
      traceId: '0193f1c2000070008000000000000001',
    });
  }

  /** El último `DataSource` creado para ese shard lógico, para leer sus `runners`. */
  dataSource(shard: string): StubDataSource {
    const found = [...this.factory.created]
      .reverse()
      .find((ds) => ds.label === shard);
    if (found === undefined) {
      throw new Error(`No DataSource was created for ${shard}`);
    }
    return found;
  }
}
