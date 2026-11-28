import { ConsistentHashStrategy } from '@platform/sharding';
import type { SharedPostgres } from '@platform/kernel/test-utils';
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
import { AcrossShards } from '../../across-shards.js';
import { CatalogDataSource } from '../../catalog-data-source.js';
import type { DatabaseSettings } from '../../config/database.config.js';
import { RequestPersistenceContextProvider } from '../../context/request-persistence-context-provider.js';
import { PersistenceError } from '../../errors/persistence-error.js';
import { EntityManagerProvider } from '../../entity-manager-provider.js';
import { EntityRegistry } from '../../entity-registry.js';
import { DatabaseAuth } from '../../model/database-auth.enum.js';
import type { DatabaseSetDefinition } from '../../model/database-set-definition.js';
import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { OptimisticWriter } from '../../optimistic-writer.js';
import { PasswordDatabaseTokenProvider } from '../../password-database-token-provider.js';
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
import { TestDatabaseServer } from './test-database-server.js';

/** Options of {@link ShardedTestDatabase}. */
export interface ShardedTestDatabaseOptions {
  /** Entities and migrations of both shards. */
  readonly shard: DatabaseSetDefinition;
  readonly catalog: DatabaseSetDefinition;
  /** `false` by default. */
  readonly requireScope?: boolean;
  /**
   * Suffix of the database names, for a second instance that lives at the same time as another one in the same
   * suite. Without it the databases are `test_shard_0`, `test_shard_1` and `test_catalog`.
   */
  readonly namespace?: string;
  /** Extensions that provisioning creates in each shard before migrating, such as `vector`. */
  readonly shardExtensions?: readonly string[];
  /** Relocation barrier checked by writes; migrations must create `tenant_write_fences`. */
  readonly fence?: TenantWriteFence;
}

/** Resolves the single harness instance to the shared server that hosts it. */
class SharedServerEndpointResolver extends InstanceEndpointResolver {
  constructor(
    private readonly server: SharedPostgres,
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
        host: this.server.host,
        port: this.server.port,
      },
      replicas: [],
    };
  }
}

/**
 * Test harness: two logical shards and a catalog on the PostgreSQL the Jest run shares, and the whole layer wired by
 * hand (without NestJS). Tenant A lives in shard 0 and tenant B in shard 1. `migrate` clones databases migrated once
 * per run instead of migrating each suite again.
 */
export class ShardedTestDatabase {
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

  readonly shardA: string;
  readonly shardB: string;
  readonly catalogName: string;

  private server: SharedPostgres | undefined;
  private readonly databases = new TestDatabaseServer();
  private readonly store = new RequestContextStore(new Tracing(new Redactor()));
  private readonly contextProvider = new RequestPersistenceContextProvider(
    this.store,
  );

  constructor(protected readonly options: ShardedTestDatabaseOptions) {
    const suffix =
      options.namespace === undefined ? '' : `_${options.namespace}`;
    this.shardA = `${ShardedTestDatabase.SHARD_A}${suffix}`;
    this.shardB = `${ShardedTestDatabase.SHARD_B}${suffix}`;
    this.catalogName = `${ShardedTestDatabase.CATALOG}${suffix}`;
  }

  /** Creates the three databases empty, replacing any a previous suite left, and builds the layer. Does not migrate: call `migrate()`. */
  async start(): Promise<void> {
    this.server = this.databases.connection();
    await this.databases.recreate(this.names());
    await this.databases.createExtensions(
      [this.shardA, this.shardB],
      this.options.shardExtensions ?? [],
    );
    this.wire(this.server);
  }

  /**
   * Leaves the catalog and both shards as `ShardedMigrationRunner` would: clones of templates that a first suite with
   * the same migrations migrated, so the migrations run once per Jest run.
   */
  async migrate(): Promise<void> {
    const server = this.requireStarted();
    await this.closeSources();
    const key = TestDatabaseServer.templateKey(
      [this.options.shard.migrations, this.options.catalog.migrations],
      this.options.shardExtensions ?? [],
    );
    const builder = new ShardedTestDatabase({
      ...this.options,
      namespace: `tpl_${key}`,
    });
    await this.databases.cloneFromTemplates(
      key,
      this.names(),
      builder.names(),
      () => builder.buildTemplates(server),
    );
    this.wire(server);
  }

  /** Closes the `DataSource`s and drops the three databases. */
  async stop(): Promise<void> {
    await this.closeSources();
    if (this.server !== undefined) {
      await this.databases.drop(this.names());
    }
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

  private names(): readonly string[] {
    return [this.shardA, this.shardB, this.catalogName];
  }

  private async closeSources(): Promise<void> {
    await this.sources?.close();
    await this.catalog?.close();
  }

  private async buildTemplates(server: SharedPostgres): Promise<void> {
    this.server = server;
    await this.databases.createExtensions(
      [this.shardA, this.shardB],
      this.options.shardExtensions ?? [],
    );
    this.wire(server);
    try {
      await this.runner.migrateAll();
    } finally {
      await this.closeSources();
    }
  }

  /** Builds the layer by hand, with the same wiring as `PersistenceModule`. */
  private wire(server: SharedPostgres): void {
    this.directory = new InMemoryDirectoryStore();
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(ShardedTestDatabase.TENANT_A)
        .withShardGroup(this.shardA)
        .build(),
    );
    this.directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(ShardedTestDatabase.TENANT_B)
        .withShardGroup(this.shardB)
        .build(),
    );
    this.directory.setInstance(this.shardA, ShardedTestDatabase.INSTANCE);
    this.directory.setInstance(this.shardB, ShardedTestDatabase.INSTANCE);
    this.router = new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      directory: this.directory,
      clock: new SystemClock(),
    });

    const password = new Secret(server.password);
    const settings: DatabaseSettings = {
      DB_AUTH: DatabaseAuth.Password,
      DB_USER: server.username,
      DB_PASSWORD: password,
      DB_SSL: false,
      DB_POOL_MAX: 5,
      DB_STATEMENT_TIMEOUT_MS: 30_000,
      DB_CATALOG_NAME: this.catalogName,
      DB_CATALOG_INSTANCE: ShardedTestDatabase.INSTANCE,
      DB_INSTANCES: {},
    };
    const endpoints = new SharedServerEndpointResolver(
      server,
      ShardedTestDatabase.INSTANCE,
    );
    const registry = new EntityRegistry();
    const factory = new PostgresDataSourceFactory(
      settings,
      this.options.shard,
      this.options.catalog,
      registry,
      new PasswordDatabaseTokenProvider(password),
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
        logicalShard: this.shardA,
        instance: ShardedTestDatabase.INSTANCE,
      },
      {
        logicalShard: this.shardB,
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

  private requireStarted(): SharedPostgres {
    if (this.server === undefined) {
      throw new Error('ShardedTestDatabase.start() was not called');
    }
    return this.server;
  }
}
