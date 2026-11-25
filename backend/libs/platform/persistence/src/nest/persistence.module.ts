import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { Clock, TransactionManager } from '@platform/kernel';
import { LoggerPort, RequestContextStore } from '@platform/observability';
import { ShardKey, ShardRouter, TenantWriteWaiter } from '@platform/sharding';
import { AcrossShards } from '../across-shards.js';
import { CatalogDataSource } from '../catalog-data-source.js';
import { ConfigInstanceEndpointResolver } from '../config-instance-endpoint-resolver.js';
import {
  DatabaseConfig,
  type DatabaseSettings,
} from '../config/database.config.js';
import { PersistenceContextProvider } from '../context/persistence-context-provider.js';
import { RequestPersistenceContextProvider } from '../context/request-persistence-context-provider.js';
import { EntityManagerProvider } from '../entity-manager-provider.js';
import { EntityRegistry } from '../entity-registry.js';
import { DatabaseKind } from '../model/database-kind.enum.js';
import type { PersistenceFeatureOptions } from '../model/persistence-feature-options.js';
import type { PersistenceModuleOptions } from '../model/persistence-module-options.js';
import { OptimisticWriter } from '../optimistic-writer.js';
import { PersistenceError } from '../errors/persistence-error.js';
import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { PersistenceFeature } from '../persistence-feature.js';
import { PostgresDataSourceFactory } from '../postgres-data-source-factory.js';
import { DataSourceFactory } from '../ports/data-source-factory.js';
import { InstanceEndpointResolver } from '../ports/instance-endpoint-resolver.js';
import { ShardLister } from '../ports/shard-lister.js';
import { RepositoryKit } from '../repository-kit.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { ShardResolver } from '../shard-resolver.js';
import { ShardScope } from '../shard-scope.js';
import { ShardScopes } from '../shard-scopes.js';
import { ShardedMigrationRunner } from '../sharded-migration-runner.js';
import { TenantWriteFence } from '../tenant-write-fence.js';
import { TypeOrmTransactionManager } from '../typeorm-transaction-manager.js';
import type { PersistenceModuleExtras } from './persistence-module-extras.js';
import {
  PERSISTENCE_OPTIONS,
  PersistenceModuleClass,
  type PersistenceModuleAsyncOptions,
} from './persistence.module-definition.js';
import { PersistenceShutdownHook } from './persistence-shutdown.hook.js';
import { PERSISTENCE_CATALOG_FEATURE } from './persistence.tokens.js';

const DEFAULT_IDLE_TTL_MS = 300_000;

/**
 * Builds persistence on TypeORM: per-shard and catalog `DataSource`s, routing, single-shard
 * transactions, `EntityManagerProvider`, `AcrossShards` and `ShardedMigrationRunner`. It is global because it is
 * registered once at the root; each business module declares its key with `forFeature`.
 *
 * Requires in the context: `ConfigModule.forRoot` (`AppConfig`), `ObservabilityModule` (`RequestContextStore`,
 * `LoggerPort`) and `ShardingModule` (`ShardRouter`).
 */
@Module({})
export class PersistenceModule extends PersistenceModuleClass {
  static override forRoot(
    options: PersistenceModuleOptions & PersistenceModuleExtras,
  ): DynamicModule {
    return PersistenceModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: PersistenceModuleAsyncOptions & PersistenceModuleExtras,
  ): DynamicModule {
    return PersistenceModule.complete(super.forRootAsync(options), options);
  }

  /**
   * Registers the repositories of a module with its sharding key (`PersistenceFeature` and `RepositoryKit`),
   * or the entities of a module that uses the catalog. The entities are added to those of the `DataSource` when it is created.
   */
  static forFeature(options: PersistenceFeatureOptions): DynamicModule {
    if ('catalog' in options) {
      return {
        module: PersistenceModule,
        providers: [
          {
            provide: PERSISTENCE_CATALOG_FEATURE,
            useFactory: (registry: EntityRegistry) => {
              registry.register(DatabaseKind.Catalog, options.entities);
              return true;
            },
            inject: [EntityRegistry],
          },
        ],
      };
    }
    const provider: Provider = {
      provide: PersistenceFeature,
      useFactory: (registry: EntityRegistry) => {
        registry.register(DatabaseKind.Shard, options.entities);
        return new PersistenceFeature({
          ...options.sharding,
          entities: options.entities,
        });
      },
      inject: [EntityRegistry],
    };
    const kit: Provider = {
      provide: RepositoryKit,
      useFactory: (
        feature: PersistenceFeature,
        entities: EntityManagerProvider,
        writer: OptimisticWriter,
        context: PersistenceContextProvider,
        scope: ShardScope,
      ) => new RepositoryKit(feature, entities, writer, context, scope),
      inject: [
        PersistenceFeature,
        EntityManagerProvider,
        OptimisticWriter,
        PersistenceContextProvider,
        ShardScope,
      ],
    };
    return {
      module: PersistenceModule,
      providers: [provider, kit],
      exports: [PersistenceFeature, RepositoryKit],
    };
  }

  /** @throws PersistenceError `PersistenceInvalidConfig` when `shardLister` is missing. */
  private static complete(
    base: DynamicModule,
    extras: PersistenceModuleExtras,
  ): DynamicModule {
    if (extras.shardLister === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.InvalidConfig,
        'PersistenceModule needs the type that lists the shards in `shardLister`',
        { details: { option: 'shardLister' } },
      );
    }
    return {
      ...base,
      global: true,
      imports: [
        ...(base.imports ?? []),
        ConfigModule.forFeature(DatabaseConfig),
      ],
      providers: [
        ...(base.providers ?? []),
        ...PersistenceModule.providersFor(extras),
      ],
      exports: [
        TransactionManager,
        TypeOrmTransactionManager,
        ShardResolver,
        ShardScope,
        ShardScopes,
        ShardDataSources,
        CatalogDataSource,
        EntityManagerProvider,
        AcrossShards,
        ShardedMigrationRunner,
        PersistenceContextProvider,
        OptimisticWriter,
        EntityRegistry,
        TenantWriteFence,
        ShardLister,
      ],
    };
  }

  private static providersFor(extras: PersistenceModuleExtras): Provider[] {
    const settings = DatabaseConfig.token;
    return [
      EntityRegistry,
      OptimisticWriter,
      PersistenceShutdownHook,
      {
        provide: PersistenceContextProvider,
        useFactory: (store: RequestContextStore) =>
          new RequestPersistenceContextProvider(store),
        inject: [RequestContextStore],
      },
      extras.endpoints === undefined
        ? {
            provide: InstanceEndpointResolver,
            useFactory: (databaseSettings: DatabaseSettings) =>
              new ConfigInstanceEndpointResolver(databaseSettings.DB_INSTANCES),
            inject: [settings],
          }
        : { provide: InstanceEndpointResolver, useExisting: extras.endpoints },
      { provide: ShardLister, useExisting: extras.shardLister },
      {
        provide: DataSourceFactory,
        useFactory: (
          databaseSettings: DatabaseSettings,
          options: PersistenceModuleOptions,
          registry: EntityRegistry,
        ) =>
          new PostgresDataSourceFactory(
            databaseSettings,
            options.shard,
            options.catalog,
            registry,
          ),
        inject: [settings, PERSISTENCE_OPTIONS, EntityRegistry],
      },
      {
        provide: ShardDataSources,
        useFactory: (
          factory: DataSourceFactory,
          endpoints: InstanceEndpointResolver,
          options: PersistenceModuleOptions,
          clock: Clock,
        ) =>
          new ShardDataSources(factory, endpoints, clock, {
            idleTtlMs: options.idleTtlMs ?? DEFAULT_IDLE_TTL_MS,
          }),
        inject: [
          DataSourceFactory,
          InstanceEndpointResolver,
          PERSISTENCE_OPTIONS,
          Clock,
        ],
      },
      {
        provide: CatalogDataSource,
        useFactory: (
          factory: DataSourceFactory,
          endpoints: InstanceEndpointResolver,
          databaseSettings: DatabaseSettings,
        ) => new CatalogDataSource(factory, endpoints, databaseSettings),
        inject: [DataSourceFactory, InstanceEndpointResolver, settings],
      },
      {
        provide: ShardScope,
        useFactory: (router: ShardRouter) => new ShardScope(router),
        inject: [ShardRouter],
      },
      {
        provide: ShardScopes,
        useFactory: (scope: ShardScope, context: RequestContextStore) =>
          new ShardScopes(scope, context),
        inject: [ShardScope, RequestContextStore],
      },
      TenantWriteFence,
      {
        provide: ShardResolver,
        useFactory: (
          router: ShardRouter,
          sources: ShardDataSources,
          scope: ShardScope,
          context: PersistenceContextProvider,
          options: PersistenceModuleOptions,
          waiter: TenantWriteWaiter | undefined,
        ) =>
          new ShardResolver(
            router,
            sources,
            scope,
            context,
            { requireScope: options.requireScope ?? false },
            options.tenantMoves === true ? waiter : undefined,
          ),
        inject: [
          ShardRouter,
          ShardDataSources,
          ShardScope,
          PersistenceContextProvider,
          PERSISTENCE_OPTIONS,
          { token: TenantWriteWaiter, optional: true },
        ],
      },
      {
        provide: TypeOrmTransactionManager,
        useFactory: (
          resolver: ShardResolver,
          context: PersistenceContextProvider,
          logger: LoggerPort,
          options: PersistenceModuleOptions,
          fence: TenantWriteFence,
        ) =>
          new TypeOrmTransactionManager(
            resolver,
            new PersistenceFeature({
              key: options.defaultSharding?.key ?? ShardKey.Tenant,
              strategy: options.defaultSharding?.strategy,
              keyResolver: options.defaultSharding?.keyResolver,
            }),
            context,
            logger,
            options.tenantMoves === true ? fence : undefined,
          ),
        inject: [
          ShardResolver,
          PersistenceContextProvider,
          LoggerPort,
          PERSISTENCE_OPTIONS,
          TenantWriteFence,
        ],
      },
      { provide: TransactionManager, useExisting: TypeOrmTransactionManager },
      {
        provide: EntityManagerProvider,
        useFactory: (
          resolver: ShardResolver,
          transactions: TypeOrmTransactionManager,
        ) => new EntityManagerProvider(resolver, transactions),
        inject: [ShardResolver, TypeOrmTransactionManager],
      },
      {
        provide: AcrossShards,
        useFactory: (
          lister: ShardLister,
          sources: ShardDataSources,
          transactions: TransactionManager,
          clock: Clock,
        ) => new AcrossShards(lister, sources, transactions, clock),
        inject: [ShardLister, ShardDataSources, TransactionManager, Clock],
      },
      {
        provide: ShardedMigrationRunner,
        useFactory: (
          lister: ShardLister,
          sources: ShardDataSources,
          catalog: CatalogDataSource,
        ) => new ShardedMigrationRunner(lister, sources, catalog),
        inject: [ShardLister, ShardDataSources, CatalogDataSource],
      },
    ];
  }
}
