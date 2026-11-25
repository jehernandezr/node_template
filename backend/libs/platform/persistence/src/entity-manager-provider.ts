import type { EntityManager } from 'typeorm';
import { ShardAccess, TransactionShardGuard } from '@platform/sharding';
import type { ManagerRequest } from './model/manager-request.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { ShardResolver } from './shard-resolver.js';
import type { TypeOrmTransactionManager } from './typeorm-transaction-manager.js';

/**
 * Provides the correct `EntityManager`: the one of the current transaction or, outside of one, the one of the shard
 * replica (`ManagerIntent.Read`) or of the primary (`ReadPrimary`). A write opens its transaction.
 */
export class EntityManagerProvider {
  constructor(
    private readonly resolver: ShardResolver,
    private readonly transactions: TypeOrmTransactionManager,
  ) {}

  /**
   * Runs `fn` with the manager and releases any `QueryRunner` it opened.
   * @throws ShardingError `CrossShardTransaction` if there is an open transaction on another shard.
   */
  async run<T>(
    request: ManagerRequest,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (request.intent === ManagerIntent.Write) {
      return this.transactions.runInTransaction((uow) => fn(uow.manager), {
        feature: request.feature,
        source: request.source,
      });
    }

    const handle = await this.resolver.resolve({
      feature: request.feature,
      source: request.source,
      access: ShardAccess.Read,
    });
    const uow = this.transactions.current();
    if (uow !== undefined) {
      // Inside a transaction its session is always used, even if the request is ReadPrimary.
      TransactionShardGuard.current()?.touch(handle.resolved.logicalShard);
      return fn(uow.manager);
    }

    const qr = handle.dataSource.createQueryRunner(
      request.intent === ManagerIntent.Read ? 'slave' : 'master',
    );
    try {
      return await fn(qr.manager);
    } finally {
      await qr.release();
    }
  }
}
