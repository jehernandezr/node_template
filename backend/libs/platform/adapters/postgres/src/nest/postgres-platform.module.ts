import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { Clock, IdempotencyStore, IdGenerator } from '@platform/kernel';
import type { ProcessedMessage } from '@platform/messaging';
import {
  AcrossShards,
  CatalogDataSource,
  EntityManagerProvider,
  PersistenceFeature,
  TypeOrmTransactionManager,
} from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import { CatalogClaimManagers } from '../database/catalog-claim-managers.js';
import { CatalogEntityManagers } from '../database/catalog-entity-managers.js';
import { PlatformEntityManagers } from '../database/platform-entity-managers.js';
import { ShardBinding } from '../database/shard-binding.js';
import { DirectoryShardLister } from '../directory/directory-shard-lister.js';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity.js';
import { ProcessedMessageEntity } from '../entities/processed-message.entity.js';
import type { PostgresPlatformModuleOptions } from '../model/postgres-platform-module-options.js';
import { platformShardEntities } from '../platform-database-sets.js';
import { ShardedRelayScopes } from '../relay/sharded-relay-scopes.js';
import { CatalogIdempotencyStore } from '../stores/catalog-idempotency-store.js';
import { ClaimTable } from '../stores/claim-table.js';
import { OutboxClaimQuery } from '../stores/outbox-claim-query.js';
import { TypeOrmDirectoryStore } from '../stores/typeorm-directory-store.js';
import { TypeOrmIdempotencyStore } from '../stores/typeorm-idempotency-store.js';
import { TypeOrmOutboxStore } from '../stores/typeorm-outbox-store.js';
import { TypeOrmProcessedMessageStore } from '../stores/typeorm-processed-message-store.js';
import {
  POSTGRES_PLATFORM_OPTIONS,
  PostgresPlatformModuleClass,
  type PostgresPlatformModuleAsyncOptions,
} from './postgres-platform.module-definition.js';

/**
 * Registra las tablas de la plataforma sobre TypeORM: `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`,
 * `TypeOrmIdempotencyStore`, `CatalogIdempotencyStore`, `TypeOrmDirectoryStore`, `DirectoryShardLister` y `ShardedRelayScopes`, con el cableado
 * de `PlatformEntityManagers`. Es global y exporta cada clase: el servicio pasa su tipo a `MessagingModule`
 * (`outboxStore`, `processedStore`, `relayScopes`), a `ShardingModule` (directorio) y a `PersistenceModule`
 * (`shardLister: DirectoryShardLister`). Requiere `PersistenceModule` y `ShardingModule`.
 *
 * Las entidades y migraciones de estas tablas las suma la app a sus `DataSource` con `platformShardEntities`,
 * `platformShardMigrations`, `platformCatalogEntities` y `platformCatalogMigrations`. `forRootAsync` arma las
 * opciones con una fábrica, por ejemplo desde `AppConfig`.
 */
@Module({})
export class PostgresPlatformModule extends PostgresPlatformModuleClass {
  static override forRoot(
    options: PostgresPlatformModuleOptions = {},
  ): DynamicModule {
    return PostgresPlatformModule.complete(super.forRoot(options));
  }

  static override forRootAsync(
    options: PostgresPlatformModuleAsyncOptions,
  ): DynamicModule {
    return PostgresPlatformModule.complete(super.forRootAsync(options));
  }

  private static complete(base: DynamicModule): DynamicModule {
    return {
      ...base,
      global: true,
      providers: [
        ...(base.providers ?? []),
        ...PostgresPlatformModule.providers(),
      ],
      exports: [
        PlatformEntityManagers,
        ShardBinding,
        TypeOrmOutboxStore,
        TypeOrmProcessedMessageStore,
        TypeOrmIdempotencyStore,
        CatalogIdempotencyStore,
        IdempotencyStore,
        TypeOrmDirectoryStore,
        DirectoryShardLister,
        ShardedRelayScopes,
      ],
    };
  }

  private static providers(): Provider[] {
    return [
      ShardBinding,
      {
        provide: PlatformEntityManagers,
        useFactory: (
          provider: EntityManagerProvider,
          transactions: TypeOrmTransactionManager,
          binding: ShardBinding,
          acrossShards: AcrossShards,
        ) =>
          new PlatformEntityManagers(
            provider,
            transactions,
            binding,
            acrossShards,
            new PersistenceFeature({
              key: ShardKey.Tenant,
              entities: platformShardEntities,
            }),
          ),
        inject: [
          EntityManagerProvider,
          TypeOrmTransactionManager,
          ShardBinding,
          AcrossShards,
        ],
      },
      {
        provide: CatalogEntityManagers,
        useFactory: (catalog: CatalogDataSource) =>
          new CatalogEntityManagers(catalog),
        inject: [CatalogDataSource],
      },
      {
        provide: TypeOrmOutboxStore,
        useFactory: (managers: PlatformEntityManagers, clock: Clock) =>
          new TypeOrmOutboxStore(managers, clock, new OutboxClaimQuery(clock)),
        inject: [PlatformEntityManagers, Clock],
      },
      {
        provide: TypeOrmProcessedMessageStore,
        useFactory: (
          managers: PlatformEntityManagers,
          ids: IdGenerator,
          clock: Clock,
        ) =>
          new TypeOrmProcessedMessageStore(
            new ClaimTable<ProcessedMessage>(
              ProcessedMessageEntity,
              managers,
              ids,
              clock,
            ),
          ),
        inject: [PlatformEntityManagers, IdGenerator, Clock],
      },
      {
        provide: TypeOrmIdempotencyStore,
        useFactory: (
          managers: PlatformEntityManagers,
          ids: IdGenerator,
          clock: Clock,
        ) =>
          new TypeOrmIdempotencyStore(
            new ClaimTable(IdempotencyKeyEntity, managers, ids, clock, {
              tenantColumn: true,
            }),
          ),
        inject: [PlatformEntityManagers, IdGenerator, Clock],
      },
      {
        provide: CatalogIdempotencyStore,
        useFactory: (
          catalog: CatalogEntityManagers,
          ids: IdGenerator,
          clock: Clock,
        ) =>
          new CatalogIdempotencyStore(
            new ClaimTable(
              IdempotencyKeyEntity,
              new CatalogClaimManagers(catalog),
              ids,
              clock,
              { tenantColumn: true },
            ),
          ),
        inject: [CatalogEntityManagers, IdGenerator, Clock],
      },
      { provide: IdempotencyStore, useExisting: TypeOrmIdempotencyStore },
      {
        provide: TypeOrmDirectoryStore,
        useFactory: (
          options: PostgresPlatformModuleOptions,
          catalog: CatalogEntityManagers,
          clock: Clock,
        ) =>
          new TypeOrmDirectoryStore(catalog, clock, {
            ...(options.directoryReadPrimary === undefined
              ? {}
              : { readPrimary: options.directoryReadPrimary }),
          }),
        inject: [POSTGRES_PLATFORM_OPTIONS, CatalogEntityManagers, Clock],
      },
      {
        provide: DirectoryShardLister,
        useFactory: (directory: TypeOrmDirectoryStore) =>
          new DirectoryShardLister(directory),
        inject: [TypeOrmDirectoryStore],
      },
      {
        provide: ShardedRelayScopes,
        useFactory: (
          options: PostgresPlatformModuleOptions,
          acrossShards: AcrossShards,
          binding: ShardBinding,
        ) => new ShardedRelayScopes(acrossShards, binding, options.relay ?? {}),
        inject: [POSTGRES_PLATFORM_OPTIONS, AcrossShards, ShardBinding],
      },
    ];
  }
}
