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
 * `PlatformEntityManagers` fijado a un shard: cada llamada corre con ese shard como shard fijo, sin tenant ni
 * `ShardedRelayScopes`. Permite correr los contratos de los stores, que llaman al store directamente, contra un
 * shard de `ShardedTestDatabase`.
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
