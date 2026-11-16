import { PlatformErrorCode } from '@contracts/platform';
import {
  ManagerIntent,
  PersistenceError,
  type AcrossShards,
  type EntityManagerProvider,
  type PersistenceFeature,
  type TypeOrmTransactionManager,
} from '@platform/persistence';
import type { DataSource, EntityManager } from 'typeorm';
import type { ShardBinding } from './shard-binding.js';

/**
 * Da a los stores de la plataforma el `EntityManager` de su shard. Con un shard fijo (`ShardBinding`) y sin
 * transacción abierta trabaja contra ese shard; en cualquier otro caso delega en `EntityManagerProvider`, que
 * resuelve el shard por el tenant del contexto o del `ShardScope` y se une a la transacción abierta.
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
   * Corre `fn` con el manager del shard. `Write` se une a la transacción abierta o abre una en el primario;
   * `Read` va a la réplica y `ReadPrimary` al primario, salvo dentro de una transacción, que manda siempre.
   * @throws ShardingError `KeyMissing` si no hay shard fijo, tenant ni `ShardScope`.
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
   * Mantenimiento que no pertenece a un tenant (retenciones): con un shard fijo corre en él y, sin shard fijo,
   * recorre todos los shards del servicio y suma lo que devuelve `fn` en cada uno.
   * @throws PersistenceError `PersistenceQueryFailed` si `fn` falló en algún shard.
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
        PlatformErrorCode.PersistenceQueryFailed,
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
