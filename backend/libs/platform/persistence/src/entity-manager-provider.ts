import type { EntityManager } from 'typeorm';
import { ShardAccess, TransactionShardGuard } from '@platform/sharding';
import type { ManagerRequest } from './model/manager-request.js';
import { ManagerIntent } from './model/manager-intent.enum.js';
import type { ShardResolver } from './shard-resolver.js';
import type { TypeOrmTransactionManager } from './typeorm-transaction-manager.js';

/**
 * Da el `EntityManager` correcto: el de la transacción actual o, fuera de ella, el de la réplica
 * del shard (`ManagerIntent.Read`) o del primario (`ReadPrimary`). Una escritura abre su transacción.
 */
export class EntityManagerProvider {
  constructor(
    private readonly resolver: ShardResolver,
    private readonly transactions: TypeOrmTransactionManager,
  ) {}

  /**
   * Ejecuta `fn` con el manager y libera cualquier `QueryRunner` que haya abierto.
   * @throws ShardingError `CrossShardTransaction` si hay una transacción abierta en otro shard.
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
      // Dentro de una transacción siempre se usa su sesión, aunque el pedido sea ReadPrimary.
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
