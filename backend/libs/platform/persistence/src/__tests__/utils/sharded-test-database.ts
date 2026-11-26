import { ConsistentHashStrategy } from '@platform/sharding';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { PersistenceErrorCode } from '../../errors/persistence-error-code.enum.js';
import { Secret } from '@platform/config';
import { SystemClock } from '@platform/kernel';
import {
  ActorType,
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardKey, ShardRouter } from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
} from '@platform/sharding/test-utils';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { AcrossShards } from '../../across-shards.js';
import { CatalogDataSource } from '../../catalog-data-source.js';
import type { DatabaseSettings } from '../../config/database.config.js';
import { RequestPersistenceContextProvider } from '../../context/request-persistence-context-provider.js';
import { PersistenceError } from '../../errors/persistence-error.js';
import { EntityManagerProvider } from '../../entity-manager-provider.js';
import { EntityRegistry } from '../../entity-registry.js';
import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { OptimisticWriter } from '../../optimistic-writer.js';
import { PersistenceFeature } from '../../persistence-feature.js';
import { PostgresDataSourceFactory } from '../../postgres-data-source-factory.js';
import { InstanceEndpointResolver } from '../../ports/instance-endpoint-resolver.js';
import { RepositoryKit } from '../../repository-kit.js';
import { ShardDataSources } from '../../shard-data-sources.js';
import { ShardResolver } from '../../shard-resolver.js';
import { ShardScope } from '../../shard-scope.js';
import { ShardedMigrationRunner } from '../../sharded-migration-runner.js';
import type { TenantWriteFence } from '../../tenant-write-fence.js';
import { TypeOrmTransactionManager } from '../../typeorm-transaction-manager.js';
import { StaticShardLister } from './static-shard-lister.js';
import { RecordingLogger } from './recording-logger.js';

/** Options of {@link ShardedTestDatabase}. */
export interface ShardedTestDatabaseOptions {
  /** Entities and migrations of both shards. */
  readonly shard: DatabaseSetDefinition;
  readonly catalog: DatabaseSetDefinition;
  /** `false` by default. */
  readonly requireScope?: boolean;
  /** PostgreSQL image; `postgres:17-alpine` by default. Suites that use pgvector request their own image. */
  readonly image?: string;
  /** Relocation barrier checked by writes; migrations must create `tenant_write_fences`. */
  readonly fence?: TenantWriteFence;
}

/** Resolves the single harness instance to the container that hosts it. */
class ContainerEndpointResolver extends InstanceEndpointResolver {
  constructor(
    private readonly container: StartedPostgreSqlContainer,
    private readonly instance: string,
  ) {
    super();
  }

  override resolve(instance: string): InstanceEndpoints {
    if (instance !== this.instance) {
      throw new PersistenceError(
        PersistenceErrorCode.InvalidConfig,
        'The test database only knows its own instance',
      );
    }
    return {
      primary: {
        host: this.container.getHost(),
        port: this.container.getPort(),
      },
      replicas: [],
    };
  }
}

/**
 * Test harness: a real PostgreSQL in a container with two logical shards and a catalog, and the whole
 * layer wired by hand (without NestJS). Tenant A lives in shard 0 and tenant B in shard 1.
 */
export class ShardedTestDatabase {
  static readonly DEFAULT_IMAGE = 'postgres:17-alpine';
  static readonly TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
  static readonly TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';
  static readonly SHARD_A = 'test_shard_0';
  static readonly SHARD_B = 'test_shard_1';
  static readonly CATALOG = 'test_catalog';
  static readonly INSTANCE = 'test-instance';

  directory!: InMemoryDirectoryStore;
  router!: ShardRouter;
  sources!: ShardDataSources;
  catalog!: CatalogDataSource;
  scope!: ShardScope;
  resolver!: ShardResolver;
  transactions!: TypeOrmTransactionManager;
  provider!: EntityManagerProvider;
  writer!: OptimisticWriter;
  acrossShards!: AcrossShards;
  runner!: ShardedMigrationRunner;
  lister!: StaticShardLister;

  private container?: StartedPostgreSqlContainer;
  private readonly store = new RequestContextStore(new Tracing(new Redactor()));
  private readonly contextProvider = new RequestPersistenceContextProvider(
    this.store,
  );

  constructor(protected readonly options: ShardedTestDatabaseOptions) {}

  /** Starts the container, creates the three databases and builds the layer. Does not migrate: call `migrate()`. */
  async start(): Promise<void> {
    const container = await new PostgreSqlContainer(
      this.options.image ?? ShardedTestDatabase.DEFAULT_IMAGE,
    )
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .start();
    this.container = container;
    await this.createDatabases(container);
    this.wire(container);
  }

  /** Applies the migrations to the catalog and both shards with `ShardedMigrationRunner`. */
  async migrate(): Promise<void> {
    this.requireStarted();
    await this.runner.migrateAll();
  }

  /** Closes the `DataSource`s and stops the container. */
  async stop(): Promise<void> {
    await this.sources?.close();
    await this.catalog?.close();
    await this.container?.stop();
  }

  /** Runs `fn` as a request of the given tenant (and user) with that tenant's `ShardScope` open, as a use case does. */
  inTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
    userId?: string,
  ): Promise<T> {
    return this.runAs(
      tenantId,
      () => this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
      userId,
    );
  }

  /** Runs `fn` as a request of the given tenant (and user), with actor and trace. */
  runAs<T>(
    tenantId: string,
    fn: () => Promise<T>,
    userId?: string,
  ): Promise<T> {
    return this.store.run(
      {
        tenantId,
        actorId: userId ?? 'test-actor',
        actorType: ActorType.User,
        userId,
        traceId: '0193f1c2-0000-7000-8000-00000000c0de',
        spanId: '00f067aa0ba902b7',
        debugSampled: false,
      },
      fn,
    );
  }

  /** Another transaction manager over the same shards, with another relocation barrier. */
  transactionsWith(fence: TenantWriteFence): TypeOrmTransactionManager {
    this.requireStarted();
    return new TypeOrmTransactionManager(
      this.resolver,
      new PersistenceFeature({ key: ShardKey.Tenant }),
      this.contextProvider,
      new RecordingLogger(),
      fence,
    );
  }

  /** `RepositoryKit` of a module with that sharding declaration, ready for a repository. */
  kitFor(feature: PersistenceFeature): RepositoryKit {
    this.requireStarted();
    return new RepositoryKit(
      feature,
      this.provider,
      this.writer,
      this.contextProvider,
      this.scope,
    );
  }

  private async createDatabases(
    container: StartedPostgreSqlContainer,
  ): Promise<void> {
    const admin = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await admin.initialize();
    try {
      for (const name of [
        ShardedTestDatabase.SHARD_A,
        ShardedTestDatabase.SHARD_B,
        ShardedTestDatabase.CATALOG,
      ]) {
        await admin.query(`CREATE DATABASE "${name}"`);
      }
    } finally {
      await admin.destroy();
    }
  }

  /** Builds the layer by hand, with the same wiring as `PersistenceModule`. */
  private wire(container: StartedPostgreSqlContainer): void {
    this.directory = new InMemoryDirectoryStore();
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(ShardedTestDatabase.TENANT_A)
        .withShardGroup(ShardedTestDatabase.SHARD_A)
        .build(),
    );
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(ShardedTestDatabase.TENANT_B)
        .withShardGroup(ShardedTestDatabase.SHARD_B)
        .build(),
    );
    this.directory.setInstance(
      ShardedTestDatabase.SHARD_A,
      ShardedTestDatabase.INSTANCE,
    );
    this.directory.setInstance(
      ShardedTestDatabase.SHARD_B,
      ShardedTestDatabase.INSTANCE,
    );
    this.router = new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      directory: this.directory,
      clock: new SystemClock(),
    });

    const settings: DatabaseSettings = {
      DB_USER: container.getUsername(),
      DB_PASSWORD: new Secret(container.getPassword()),
      DB_SSL: false,
      DB_POOL_MAX: 5,
      DB_STATEMENT_TIMEOUT_MS: 30_000,
      DB_CATALOG_NAME: ShardedTestDatabase.CATALOG,
      DB_CATALOG_INSTANCE: ShardedTestDatabase.INSTANCE,
      DB_INSTANCES: {},
    };
    const endpoints = new ContainerEndpointResolver(
      container,
      ShardedTestDatabase.INSTANCE,
    );
    const registry = new EntityRegistry();
    const factory = new PostgresDataSourceFactory(
      settings,
      this.options.shard,
      this.options.catalog,
      registry,
    );
    this.sources = new ShardDataSources(factory, endpoints, new SystemClock(), {
      idleTtlMs: 300_000,
    });
    this.catalog = new CatalogDataSource(factory, endpoints, settings);
    this.scope = new ShardScope(this.router);
    this.resolver = new ShardResolver(
      this.router,
      this.sources,
      this.scope,
      this.contextProvider,
      { requireScope: this.options.requireScope ?? false },
    );
    this.transactions = new TypeOrmTransactionManager(
      this.resolver,
      new PersistenceFeature({ key: ShardKey.Tenant }),
      this.contextProvider,
      new RecordingLogger(),
      this.options.fence,
    );
    this.provider = new EntityManagerProvider(this.resolver, this.transactions);
    this.writer = new OptimisticWriter();
    this.lister = new StaticShardLister([
      {
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      },
      {
        logicalShard: ShardedTestDatabase.SHARD_B,
        instance: ShardedTestDatabase.INSTANCE,
      },
    ]);
    this.acrossShards = new AcrossShards(
      this.lister,
      this.sources,
      this.transactions,
      new SystemClock(),
    );
    this.runner = new ShardedMigrationRunner(
      this.lister,
      this.sources,
      this.catalog,
    );
  }

  private requireStarted(): void {
    if (this.container === undefined) {
      throw new Error('ShardedTestDatabase.start() was not called');
    }
  }
}
