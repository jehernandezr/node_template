import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { PersistenceFeature } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import { CatalogEntityManagers } from '../../database/catalog-entity-managers.js';
import { PlatformEntityManagers } from '../../database/platform-entity-managers.js';
import { ShardBinding } from '../../database/shard-binding.js';
import {
  platformCatalogEntities,
  platformCatalogMigrations,
  platformShardEntities,
  platformShardMigrations,
} from '../../platform-database-sets.js';
import { PinnedPlatformEntityManagers } from './pinned-platform-entity-managers.js';

/**
 * A real PostgreSQL with two shards and a catalog, with the migrations of the platform tables already applied
 * (`ShardedTestDatabase`), and the `EntityManager`s the stores use. Tenant A lives in shard 0 and B in shard 1.
 */
export class PlatformTestDatabase {
  static readonly TENANT_A = ShardedTestDatabase.TENANT_A;
  static readonly TENANT_B = ShardedTestDatabase.TENANT_B;
  static readonly SHARD_A = ShardedTestDatabase.SHARD_A;
  static readonly SHARD_B = ShardedTestDatabase.SHARD_B;

  private static readonly SHARD_TABLES = [
    'outbox',
    'processed_messages',
    'idempotency_keys',
  ];
  private static readonly CATALOG_TABLES = [
    'shard_directory',
    'shard_instances',
    'shard_locks',
    'idempotency_keys',
  ];

  readonly db = new ShardedTestDatabase({
    shard: {
      entities: platformShardEntities,
      migrations: platformShardMigrations,
    },
    catalog: {
      entities: platformCatalogEntities,
      migrations: platformCatalogMigrations,
    },
  });
  readonly binding = new ShardBinding();
  readonly feature = new PersistenceFeature({ key: ShardKey.Tenant });
  /** Resolves the shard by the context tenant, as in production. */
  managers!: PlatformEntityManagers;
  catalogManagers!: CatalogEntityManagers;

  /** Starts the container, migrates both shards and the catalog and builds the managers. */
  async start(): Promise<void> {
    await this.db.start();
    await this.db.migrate();
    this.managers = new PlatformEntityManagers(
      this.db.provider,
      this.db.transactions,
      this.binding,
      this.db.acrossShards,
      this.feature,
    );
    this.catalogManagers = new CatalogEntityManagers(this.db.catalog);
  }

  async stop(): Promise<void> {
    await this.db.stop();
  }

  /** Managers pinned to a shard: to run a contract against that shard without a tenant. */
  async pinned(shard: string): Promise<PlatformEntityManagers> {
    const dataSource = await this.db.sources.get({
      logicalShard: shard,
      instance: ShardedTestDatabase.INSTANCE,
    });
    return new PinnedPlatformEntityManagers(
      this.db.provider,
      this.db.transactions,
      this.binding,
      this.db.acrossShards,
      this.feature,
      {
        location: {
          logicalShard: shard,
          instance: ShardedTestDatabase.INSTANCE,
        },
        dataSource,
      },
    );
  }

  /** Empties the platform tables of both shards and the catalog, so each test starts from scratch. */
  async truncateAll(): Promise<void> {
    for (const shard of [
      PlatformTestDatabase.SHARD_A,
      PlatformTestDatabase.SHARD_B,
    ]) {
      const dataSource = await this.db.sources.get({
        logicalShard: shard,
        instance: ShardedTestDatabase.INSTANCE,
      });
      await dataSource.query(
        `TRUNCATE ${PlatformTestDatabase.SHARD_TABLES.join(', ')}`,
      );
    }
    const catalog = await this.db.catalog.get();
    await catalog.query(
      `TRUNCATE ${PlatformTestDatabase.CATALOG_TABLES.join(', ')}`,
    );
  }
}
