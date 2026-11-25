import {
  ManagerIntent,
  type AcrossShards,
  type EntityManagerProvider,
  type PersistenceFeature,
  type ShardConnection,
  type TypeOrmTransactionManager,
} from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import { PlatformEntityManagers } from '../../database/platform-entity-managers.js';
import type { ShardBinding } from '../../database/shard-binding.js';

/**
 * `PlatformEntityManagers` pinned to a shard: each call runs with that shard as the fixed shard, without a tenant or
 * `ShardedRelayScopes`. Allows running the store contracts, which call the store directly, against a
 * shard of `ShardedTestDatabase`.
 */
export class PinnedPlatformEntityManagers extends PlatformEntityManagers {
  constructor(
    provider: EntityManagerProvider,
    transactions: TypeOrmTransactionManager,
    private readonly shardBinding: ShardBinding,
    acrossShards: AcrossShards,
    feature: PersistenceFeature,
    private readonly connection: ShardConnection,
  ) {
    super(provider, transactions, shardBinding, acrossShards, feature);
  }

  override run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.shardBinding.run(this.connection, () => super.run(intent, fn));
  }

  override sweep(
    fn: (manager: EntityManager) => Promise<number>,
  ): Promise<number> {
    return this.run(ManagerIntent.Write, fn);
  }
}
