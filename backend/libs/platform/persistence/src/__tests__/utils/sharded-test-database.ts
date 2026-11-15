import { PlatformErrorCode } from '@contracts/platform';
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
import { PersistenceError } from '../../errors.js';
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
import { TypeOrmTransactionManager } from '../../typeorm-transaction-manager.js';
import { StaticShardLister } from './static-shard-lister.js';
import { RecordingLogger } from './recording-logger.js';

/** Opciones de {@link ShardedTestDatabase}. */
export interface ShardedTestDatabaseOptions {
  /** Entidades y migraciones de los dos shards. */
  readonly shard: DatabaseSetDefinition;
  readonly catalog: DatabaseSetDefinition;
  /** Por defecto `false`. */
  readonly requireScope?: boolean;
}

/** Resuelve la única instancia del arnés al contenedor que la aloja. */
class ContainerEndpointResolver extends InstanceEndpointResolver {
  constructor(
    private readonly container: StartedPostgreSqlContainer,
    private readonly instance: string,
  ) {
    super();
  }

  resolve(instance: string): InstanceEndpoints {
    if (instance !== this.instance) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceInvalidConfig,
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
 * Arnés de pruebas: un PostgreSQL real en un contenedor con dos shards lógicos y un catálogo, y toda
 * la capa cableada a mano (sin NestJS). El tenant A vive en el shard 0 y el tenant B en el shard 1.
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

  private container?: StartedPostgreSqlContainer;
  private readonly store = new RequestContextStore(new Tracing(new Redactor()));
  private readonly contextProvider = new RequestPersistenceContextProvider(
    this.store,
  );

  constructor(protected readonly options: ShardedTestDatabaseOptions) {}

  /** Arranca el contenedor, crea las tres bases y arma la capa. No migra: llama a `migrate()`. */
  async start(): Promise<void> {
    const container = await new PostgreSqlContainer(
      'postgres:17-alpine',
    ).start();
    this.container = container;
    await this.createDatabases(container);
    this.wire(container);
  }

  /** Aplica las migraciones al catálogo y a los dos shards con `ShardedMigrationRunner`. */
  async migrate(): Promise<void> {
    this.requireStarted();
    await this.runner.migrateAll();
  }

  /** Cierra los `DataSource` y detiene el contenedor. */
  async stop(): Promise<void> {
    await this.sources?.close();
    await this.catalog?.close();
    await this.container?.stop();
  }

  /** Ejecuta `fn` como una petición del tenant (y del usuario) dados, con actor y traza. */
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

  /** `RepositoryKit` de un módulo con esa declaración de sharding, listo para un repositorio. */
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

  /** Arma la capa a mano, con el mismo cableado que `PersistenceModule`. */
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
    );
    this.provider = new EntityManagerProvider(this.resolver, this.transactions);
    this.writer = new OptimisticWriter();
    const lister = new StaticShardLister([
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
      lister,
      this.sources,
      this.transactions,
      new SystemClock(),
    );
    this.runner = new ShardedMigrationRunner(
      lister,
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
