import type { ShardRouter } from '@platform/sharding';
import { ShardKey } from '@platform/sharding';
import { FixedClock } from '@platform/kernel/test-utils';
import type { EntityManager } from 'typeorm';
import type { PersistenceContextProvider } from '../../context/persistence-context-provider.js';
import { EntityManagerProvider } from '../../entity-manager-provider.js';
import type { ManagerRequest } from '../../model/manager-request.js';
import { PersistenceFeature } from '../../persistence-feature.js';
import { ShardDataSources } from '../../shard-data-sources.js';
import { ShardResolver } from '../../shard-resolver.js';
import type { ShardScope } from '../../shard-scope.js';
import { TypeOrmTransactionManager } from '../../typeorm-transaction-manager.js';
import { FakeDataSourceFactory } from './fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './fake-instance-endpoint-resolver.js';
import { RecordingLogger } from './recording-logger.js';
import type { StubDataSource } from './stub-data-source.js';
import type { StubQueryRunner } from './stub-query-runner.js';

/**
 * `EntityManagerProvider` sin base: la resolución y las transacciones son las reales, pero `run` entrega
 * el manager del único `StubQueryRunner` del `StubDataSource` y registra cada petición.
 */
export class FakeEntityManagerProvider extends EntityManagerProvider {
  readonly requests: ManagerRequest[] = [];
  readonly dataSource: StubDataSource;
  private readonly runnerInstance: StubQueryRunner;

  constructor(
    context: PersistenceContextProvider,
    scope: ShardScope,
    router: ShardRouter,
    dataSource: StubDataSource,
  ) {
    super(...FakeEntityManagerProvider.wiringFor(context, scope, router));
    this.dataSource = dataSource;
    dataSource.createQueryRunner();
    this.runnerInstance = dataSource.runners[dataSource.runners.length - 1];
  }

  /** El `StubQueryRunner` que usan las peticiones de `run`. */
  get runner(): StubQueryRunner {
    return this.runnerInstance;
  }

  override run<T>(
    request: ManagerRequest,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    this.requests.push(request);
    return fn(this.runnerInstance.manager);
  }

  private static wiringFor(
    context: PersistenceContextProvider,
    scope: ShardScope,
    router: ShardRouter,
  ): [ShardResolver, TypeOrmTransactionManager] {
    const sources = new ShardDataSources(
      new FakeDataSourceFactory(),
      new FakeInstanceEndpointResolver(),
      new FixedClock(),
      { idleTtlMs: 60_000 },
    );
    const resolver = new ShardResolver(router, sources, scope, context, {
      requireScope: false,
    });
    const transactions = new TypeOrmTransactionManager(
      resolver,
      new PersistenceFeature({ key: ShardKey.Tenant }),
      context,
      new RecordingLogger(),
    );
    return [resolver, transactions];
  }
}
