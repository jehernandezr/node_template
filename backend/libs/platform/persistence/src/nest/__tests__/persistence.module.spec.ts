import { Global, Injectable, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PlatformErrorCode } from '@contracts/platform';
import { ConfigModule } from '@platform/config/nest';
import { FixedClock } from '@platform/kernel/test-utils';
import { Clock, TransactionManager } from '@platform/kernel';
import {
  ActorType,
  LoggerPort,
  RequestContextStore,
  Redactor,
  Tracing,
} from '@platform/observability';
import {
  ShardAccess,
  ShardKey,
  ShardRouter,
  ShardingErrorCode,
} from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { Column, Entity } from 'typeorm';
import { AcrossShards } from '../../across-shards.js';
import { CatalogDataSource } from '../../catalog-data-source.js';
import { AuditedEntity } from '../../entities/audited-entity.js';
import { VersionedEntity } from '../../entities/versioned-entity.js';
import { EntityManagerProvider } from '../../entity-manager-provider.js';
import { EntityRegistry } from '../../entity-registry.js';
import { DatabaseKind } from '../../model/database-kind.enum.js';
import { PersistenceFeature } from '../../persistence-feature.js';
import { InstanceEndpointResolver } from '../../ports/instance-endpoint-resolver.js';
import { RepositoryKit } from '../../repository-kit.js';
import { ShardDataSources } from '../../shard-data-sources.js';
import { ShardResolver } from '../../shard-resolver.js';
import { ShardScope } from '../../shard-scope.js';
import { ShardedMigrationRunner } from '../../sharded-migration-runner.js';
import { TypeOrmTransactionManager } from '../../typeorm-transaction-manager.js';
import { FakeDataSourceFactory } from '../../__tests__/utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from '../../__tests__/utils/fake-instance-endpoint-resolver.js';
import { ProbeDatabaseSets } from '../../__tests__/utils/probe-database-sets.js';
import { ProbeEntity } from '../../__tests__/utils/probe.entity.js';
import { RecordingLogger } from '../../__tests__/utils/recording-logger.js';
import { StaticShardLister } from '../../__tests__/utils/static-shard-lister.js';
import { PersistenceModule } from '../persistence.module.js';

/** Entidad de un módulo que trabaja por usuario, para comprobar que su declaración no se mezcla con la del tenant. */
@Entity({ name: 'spec_user_labels' })
class SpecUserEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 64, name: 'label', nullable: false })
  label!: string;
}

/** Entidad del catálogo global. */
@Entity({ name: 'spec_catalog_items' })
class SpecCatalogEntity extends VersionedEntity {
  @Column({ type: 'varchar', length: 64, name: 'code', nullable: false })
  code!: string;
}

/** Lista de shards del servicio en la prueba: un solo shard lógico en la instancia de prueba. */
@Injectable()
class SpecShardLister extends StaticShardLister {
  constructor() {
    super([{ logicalShard: 'spec_shard_0', instance: 'stub-instance' }]);
  }
}

/** Resolución de instancias propia del servicio, en lugar de la que lee `DB_INSTANCES`. */
@Injectable()
class SpecEndpoints extends FakeInstanceEndpointResolver {}

/** Entrega el `RepositoryKit` del módulo que lo declara, para ver su llave y sus entidades. */
@Injectable()
class TenantFeatureConsumer {
  constructor(readonly kit: RepositoryKit) {}
}

/** Entrega el `RepositoryKit` del módulo que trabaja por usuario. */
@Injectable()
class UserFeatureConsumer {
  constructor(readonly kit: RepositoryKit) {}
}

/** Dependencias globales que el servicio aporta: contexto, logs, ruteo y la lista de shards. */
@Global()
@Module({
  providers: [
    {
      provide: RequestContextStore,
      useValue: new RequestContextStore(new Tracing(new Redactor())),
    },
    {
      provide: ShardRouter,
      useValue: new ShardRouter({ directory: new InMemoryDirectoryStore() }),
    },
    { provide: LoggerPort, useValue: new RecordingLogger() },
    SpecShardLister,
    SpecEndpoints,
  ],
  exports: [
    RequestContextStore,
    ShardRouter,
    LoggerPort,
    SpecShardLister,
    SpecEndpoints,
  ],
})
class SpecGlobalModule {}

/** Reloj del contenedor, que la persistencia toma en lugar del reloj del sistema. */
@Global()
@Module({
  providers: [{ provide: Clock, useValue: new FixedClock() }],
  exports: [Clock],
})
class SpecClockModule {}

/** `ShardDataSources` que registra su cierre, para comprobarlo al apagar el módulo. */
class ClosableShardDataSources extends ShardDataSources {
  closed = false;

  constructor() {
    super(
      new FakeDataSourceFactory(),
      new FakeInstanceEndpointResolver(),
      new FixedClock(),
      {
        idleTtlMs: 60_000,
      },
    );
  }

  override close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

/** `CatalogDataSource` que registra su cierre. */
class ClosableCatalogDataSource extends CatalogDataSource {
  closed = false;

  constructor() {
    super(new FakeDataSourceFactory(), new FakeInstanceEndpointResolver(), {
      DB_CATALOG_NAME: 'catalog',
      DB_CATALOG_INSTANCE: 'stub-instance',
    });
  }

  override close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

const CONFIG = ConfigModule.forRoot({
  env: {
    DB_USER: 'app',
    DB_PASSWORD: 'secret',
    DB_INSTANCES: JSON.stringify({
      'stub-instance': { primary: { host: 'localhost', port: 5432 } },
    }),
  },
});

function rootOptions() {
  return {
    shard: ProbeDatabaseSets.shard,
    catalog: ProbeDatabaseSets.catalog,
    shardLister: SpecShardLister,
    requireScope: true,
  };
}

describe('PersistenceModule', () => {
  describe('forRoot', () => {
    it('resolves the persistence services and the transaction port', async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          CONFIG,
          PersistenceModule.forRoot(rootOptions()),
        ],
      }).compile();

      const transactions = moduleRef.get(TypeOrmTransactionManager, {
        strict: false,
      });
      expect(moduleRef.get(TransactionManager, { strict: false })).toBe(
        transactions,
      );
      expect(moduleRef.get(ShardResolver, { strict: false })).toBeInstanceOf(
        ShardResolver,
      );
      expect(moduleRef.get(ShardScope, { strict: false })).toBeInstanceOf(
        ShardScope,
      );
      expect(
        moduleRef.get(EntityManagerProvider, { strict: false }),
      ).toBeInstanceOf(EntityManagerProvider);
      expect(moduleRef.get(AcrossShards, { strict: false })).toBeInstanceOf(
        AcrossShards,
      );
      expect(
        moduleRef.get(ShardedMigrationRunner, { strict: false }),
      ).toBeInstanceOf(ShardedMigrationRunner);
    });

    it('rejects a configuration without a shard lister with PersistenceInvalidConfig', async () => {
      const options = {
        shard: ProbeDatabaseSets.shard,
        catalog: ProbeDatabaseSets.catalog,
      };

      await expect(async () =>
        PersistenceModule.forRoot(options),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      });
    });
  });

  describe('forRootAsync', () => {
    it('builds the options with the factory and uses the endpoint resolver it receives', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          CONFIG,
          PersistenceModule.forRootAsync({
            useFactory: () => ({
              shard: ProbeDatabaseSets.shard,
              catalog: ProbeDatabaseSets.catalog,
              requireScope: true,
            }),
            shardLister: SpecShardLister,
            endpoints: SpecEndpoints,
          }),
        ],
      }).compile();

      expect(moduleRef.get(InstanceEndpointResolver, { strict: false })).toBe(
        moduleRef.get(SpecEndpoints),
      );
      await expect(
        moduleRef.get(ShardResolver, { strict: false }).resolve({
          feature: new PersistenceFeature({ key: ShardKey.Tenant }),
          access: ShardAccess.Read,
        }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.KeyMissing,
        details: { requireScope: true },
      });
    });
  });

  describe('default sharding', () => {
    it('routes a transaction without a module by the declared default key', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          SpecClockModule,
          CONFIG,
          PersistenceModule.forRoot({
            shard: ProbeDatabaseSets.shard,
            catalog: ProbeDatabaseSets.catalog,
            shardLister: SpecShardLister,
            defaultSharding: { key: ShardKey.User },
            idleTtlMs: 1_000,
          }),
        ],
      }).compile();
      const store = moduleRef.get(RequestContextStore);
      const transactions = moduleRef.get(TransactionManager, {
        strict: false,
      });

      // Con la llave por usuario, un contexto que solo trae tenant no alcanza para elegir el shard.
      await expect(
        store.run(
          {
            tenantId: '0193f1c2-0000-7000-8000-00000000000a',
            actorType: ActorType.System,
          },
          () => transactions.runInTransaction(() => Promise.resolve()),
        ),
      ).rejects.toMatchObject({ code: ShardingErrorCode.KeyMissing });
    });
  });

  describe('forFeature', () => {
    it('gives each module its own feature declaration and entities', async () => {
      @Module({
        imports: [
          PersistenceModule.forFeature({
            entities: [ProbeEntity],
            sharding: { key: ShardKey.Tenant },
          }),
        ],
        providers: [TenantFeatureConsumer],
      })
      class TenantFeatureModule {}

      @Module({
        imports: [
          PersistenceModule.forFeature({
            entities: [SpecUserEntity],
            sharding: { key: ShardKey.User },
          }),
        ],
        providers: [UserFeatureConsumer],
      })
      class UserFeatureModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          CONFIG,
          PersistenceModule.forRoot(rootOptions()),
          TenantFeatureModule,
          UserFeatureModule,
        ],
      }).compile();

      const tenant = moduleRef.get(TenantFeatureConsumer).kit.feature;
      const user = moduleRef.get(UserFeatureConsumer).kit.feature;
      expect(tenant.sharding.options.key).toBe(ShardKey.Tenant);
      expect(tenant.entities).toEqual([ProbeEntity]);
      expect(user.sharding.options.key).toBe(ShardKey.User);
      expect(user.entities).toEqual([SpecUserEntity]);
    });

    it('registers the entities of sharded and catalog modules in their own database kind', async () => {
      @Module({
        imports: [
          PersistenceModule.forFeature({
            entities: [SpecUserEntity],
            sharding: { key: ShardKey.User },
          }),
        ],
      })
      class ShardedModule {}

      @Module({
        imports: [
          PersistenceModule.forFeature({
            entities: [SpecCatalogEntity],
            catalog: true,
          }),
        ],
      })
      class CatalogModule {}

      @Module({
        imports: [
          PersistenceModule.forFeature({
            entities: [ProbeEntity],
            sharding: { key: ShardKey.Tenant },
          }),
        ],
      })
      class TenantModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          CONFIG,
          PersistenceModule.forRoot(rootOptions()),
          ShardedModule,
          TenantModule,
          CatalogModule,
        ],
      }).compile();

      const registry = moduleRef.get(EntityRegistry, { strict: false });
      expect(registry.entities(DatabaseKind.Shard)).toEqual([
        SpecUserEntity,
        ProbeEntity,
      ]);
      expect(registry.entities(DatabaseKind.Catalog)).toEqual([
        SpecCatalogEntity,
      ]);
    });
  });

  describe('shutdown', () => {
    it('closes the shard and catalog data sources when the module is closed', async () => {
      const sources = new ClosableShardDataSources();
      const catalog = new ClosableCatalogDataSource();
      const moduleRef = await Test.createTestingModule({
        imports: [
          SpecGlobalModule,
          CONFIG,
          PersistenceModule.forRoot(rootOptions()),
        ],
      })
        .overrideProvider(ShardDataSources)
        .useValue(sources)
        .overrideProvider(CatalogDataSource)
        .useValue(catalog)
        .compile();

      await moduleRef.close();

      expect(sources.closed).toBe(true);
      expect(catalog.closed).toBe(true);
    });
  });
});
