import {
  ManagerIntent,
  PersistenceError,
  type AcrossShards,
  type EntityManagerProvider,
  type PersistenceFeature,
  type TypeOrmTransactionManager,
  PersistenceErrorCode,
} from '@platform/persistence';
import type { DataSource, EntityManager } from 'typeorm';
import type { ShardBinding } from './shard-binding.js';

/**
 * Gives the platform stores the `EntityManager` of their shard. With a fixed shard (`ShardBinding`) and no
 * open transaction it works against that shard; in any other case it delegates to `EntityManagerProvider`, which
 * resolves the shard by the tenant of the context or of the `ShardScope` and joins the open transaction.
 */
export class PlatformEntityManagers {
  constructor(
    private readonly provider: EntityManagerProvider,
    private readonly transactions: TypeOrmTransactionManager,
    private readonly binding: ShardBinding,
    private readonly acrossShards: AcrossShards,
    private readonly feature: PersistenceFeature,
  ) {}

  /**
   * Runs `fn` with the shard's manager. `Write` joins the open transaction or opens one on the primary;
   * `Read` goes to the replica and `ReadPrimary` to the primary, except inside a transaction, which always wins.
   * @throws ShardingError `KeyMissing` if there is no fixed shard, tenant or `ShardScope`.
   */
  run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const bound = this.binding.current();
    if (bound === undefined || this.transactions.isInTransaction()) {
      return this.provider.run({ feature: this.feature, intent }, fn);
    }
    return this.runBound(bound.dataSource, intent, fn);
  }

  /**
   * Maintenance that does not belong to a tenant (retention): with a fixed shard it runs on it and, without a fixed shard,
   * goes through all the service's shards and sums what `fn` returns on each one.
   * @throws PersistenceError `PersistenceQueryFailed` if `fn` failed on any shard.
   */
  async sweep(
    fn: (manager: EntityManager) => Promise<number>,
  ): Promise<number> {
    if (this.binding.current() !== undefined) {
      return this.run(ManagerIntent.Write, fn);
    }
    const outcome = await this.acrossShards.run((connection) =>
      this.binding.run(connection, () => this.run(ManagerIntent.Write, fn)),
    );
    if (outcome.partial) {
      throw new PersistenceError(
        PersistenceErrorCode.QueryFailed,
        'The maintenance sweep failed in some shards',
        {
          details: { shards: outcome.failures.map((failure) => failure.shard) },
        },
      );
    }
    return outcome.results.reduce((sum, result) => sum + result.value, 0);
  }

  private async runBound<T>(
    dataSource: DataSource,
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (intent === ManagerIntent.Write) {
      return dataSource.transaction((manager) => fn(manager));
    }
    const runner = dataSource.createQueryRunner(
      intent === ManagerIntent.Read ? 'slave' : 'master',
    );
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }
}
