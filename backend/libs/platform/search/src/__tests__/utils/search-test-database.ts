import {
  PlatformPersistenceMigrations,
  PersistenceFeature,
  type RepositoryKit,
} from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { ShardKey } from '@platform/sharding';
import { CreateSearchDocuments1794800000001 } from './create-search-documents.migration.js';

/** Two shards with pgvector and `search_documents`, and a helper to run in a tenant's shard. */
export class SearchTestDatabase {
  static readonly TENANT_A = ShardedTestDatabase.TENANT_A;
  static readonly TENANT_B = ShardedTestDatabase.TENANT_B;

  private readonly db = new ShardedTestDatabase({
    shard: {
      entities: [],
      migrations: [
        ...PlatformPersistenceMigrations.shard,
        CreateSearchDocuments1794800000001,
      ],
    },
    catalog: { entities: [], migrations: [] },
  });

  async start(): Promise<void> {
    await this.db.start();
    await this.db.migrate();
  }

  stop(): Promise<void> {
    return this.db.stop();
  }

  kit(): RepositoryKit {
    return this.db.kitFor(
      new PersistenceFeature({ key: ShardKey.Tenant, entities: [] }),
    );
  }

  inTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.db.runAs(tenantId, () =>
      this.db.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }

  inTransaction<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.inTenant(tenantId, () =>
      this.db.transactions.runInTransaction(() => fn()),
    );
  }
}
