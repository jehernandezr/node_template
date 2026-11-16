import { Global, Module, type DynamicModule } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Clock, IdempotencyStore, IdGenerator } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  AcrossShards,
  CatalogDataSource,
  EntityManagerProvider,
  TypeOrmTransactionManager,
} from '@platform/persistence';
import { PostgresPlatformModule } from '../postgres-platform.module.js';
import { DirectoryShardLister } from '../../directory/directory-shard-lister.js';
import { PlatformEntityManagers } from '../../database/platform-entity-managers.js';
import { ShardBinding } from '../../database/shard-binding.js';
import { ShardedRelayScopes } from '../../relay/sharded-relay-scopes.js';
import { TypeOrmDirectoryStore } from '../../stores/typeorm-directory-store.js';
import { TypeOrmIdempotencyStore } from '../../stores/typeorm-idempotency-store.js';
import { TypeOrmOutboxStore } from '../../stores/typeorm-outbox-store.js';
import { TypeOrmProcessedMessageStore } from '../../stores/typeorm-processed-message-store.js';
import {
  RecordingAcrossShards,
  RecordingCatalogDataSource,
  UnusedCollaborator,
} from './utils/index.js';

const TENANT = 'tenant-a';

describe('PostgresPlatformModule', () => {
  let acrossShards: RecordingAcrossShards;
  let catalog: RecordingCatalogDataSource;

  beforeEach(() => {
    acrossShards = new RecordingAcrossShards();
    catalog = new RecordingCatalogDataSource();
  });

  function compile(platform: DynamicModule): Promise<TestingModule> {
    @Global()
    @Module({
      providers: [
        {
          provide: EntityManagerProvider,
          useValue: new UnusedCollaborator('EntityManagerProvider'),
        },
        {
          provide: TypeOrmTransactionManager,
          useValue: new UnusedCollaborator('TypeOrmTransactionManager'),
        },
        { provide: AcrossShards, useValue: acrossShards },
        { provide: CatalogDataSource, useValue: catalog },
        { provide: Clock, useValue: new FixedClock() },
        { provide: IdGenerator, useValue: new SequentialIdGenerator() },
      ],
      exports: [
        EntityManagerProvider,
        TypeOrmTransactionManager,
        AcrossShards,
        CatalogDataSource,
        Clock,
        IdGenerator,
      ],
    })
    class CollaboratorsModule {}

    return Test.createTestingModule({
      imports: [CollaboratorsModule, platform],
    }).compile();
  }

  it('resolves every platform store, the lister and the relay scopes', async () => {
    const moduleRef = await compile(PostgresPlatformModule.forRoot());

    expect(moduleRef.get(TypeOrmOutboxStore)).toBeInstanceOf(
      TypeOrmOutboxStore,
    );
    expect(moduleRef.get(TypeOrmProcessedMessageStore)).toBeInstanceOf(
      TypeOrmProcessedMessageStore,
    );
    expect(moduleRef.get(TypeOrmIdempotencyStore)).toBeInstanceOf(
      TypeOrmIdempotencyStore,
    );
    expect(moduleRef.get(TypeOrmDirectoryStore)).toBeInstanceOf(
      TypeOrmDirectoryStore,
    );
    expect(moduleRef.get(DirectoryShardLister)).toBeInstanceOf(
      DirectoryShardLister,
    );
    expect(moduleRef.get(ShardedRelayScopes)).toBeInstanceOf(
      ShardedRelayScopes,
    );
    expect(moduleRef.get(PlatformEntityManagers)).toBeInstanceOf(
      PlatformEntityManagers,
    );
    expect(moduleRef.get(ShardBinding)).toBeInstanceOf(ShardBinding);
  });

  it('binds the idempotency port to the same instance as its adapter', async () => {
    const moduleRef = await compile(PostgresPlatformModule.forRoot());

    expect(moduleRef.get(IdempotencyStore)).toBe(
      moduleRef.get(TypeOrmIdempotencyStore),
    );
  });

  describe('without options', () => {
    it('reads the directory from the catalog replica', async () => {
      const moduleRef = await compile(PostgresPlatformModule.forRoot());

      await moduleRef.get(TypeOrmDirectoryStore).getPlacement(TENANT);

      expect(catalog.modes).toEqual(['slave']);
    });

    it('runs the relay pass with the default shard timeout', async () => {
      const moduleRef = await compile(PostgresPlatformModule.forRoot());

      await moduleRef.get(ShardedRelayScopes).forEach(() => Promise.resolve());

      expect(acrossShards.calls).toEqual([
        { shardTimeoutMs: ShardedRelayScopes.DEFAULT_SHARD_TIMEOUT_MS },
      ]);
    });
  });

  describe('with forRoot options', () => {
    it('reads the directory from the catalog primary and passes the relay tuning', async () => {
      const moduleRef = await compile(
        PostgresPlatformModule.forRoot({
          directoryReadPrimary: true,
          relay: { concurrency: 2, shardTimeoutMs: 1_000 },
        }),
      );

      await moduleRef.get(TypeOrmDirectoryStore).getPlacement(TENANT);
      await moduleRef.get(ShardedRelayScopes).forEach(() => Promise.resolve());

      expect(catalog.modes).toEqual(['master']);
      expect(acrossShards.calls).toEqual([
        { concurrency: 2, shardTimeoutMs: 1_000 },
      ]);
    });
  });

  describe('with forRootAsync', () => {
    it('builds the options with the factory', async () => {
      const moduleRef = await compile(
        PostgresPlatformModule.forRootAsync({
          useFactory: () => ({
            directoryReadPrimary: true,
            relay: { concurrency: 3 },
          }),
        }),
      );

      await moduleRef.get(TypeOrmDirectoryStore).getPlacement(TENANT);
      await moduleRef.get(ShardedRelayScopes).forEach(() => Promise.resolve());

      expect(catalog.modes).toEqual(['master']);
      expect(acrossShards.calls).toEqual([
        {
          concurrency: 3,
          shardTimeoutMs: ShardedRelayScopes.DEFAULT_SHARD_TIMEOUT_MS,
        },
      ]);
      expect(moduleRef.get(IdempotencyStore)).toBe(
        moduleRef.get(TypeOrmIdempotencyStore),
      );
    });
  });
});
