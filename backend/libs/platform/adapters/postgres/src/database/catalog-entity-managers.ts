import type { CatalogDataSource } from '@platform/persistence';
import type { EntityManager, ReplicationMode } from 'typeorm';

/** Da a los stores del catálogo global el `EntityManager` de su `DataSource`: réplica, primario o transacción. */
export class CatalogEntityManagers {
  constructor(private readonly catalog: CatalogDataSource) {}

  /** Lee con un manager de la réplica del catálogo. */
  async read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.withRunner('slave', fn);
  }

  /** Lee del primario del catálogo: para lo recién confirmado y para decisiones que no toleran el retraso de réplica. */
  async readPrimary<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.withRunner('master', fn);
  }

  /** Escribe en una transacción del primario del catálogo. */
  async write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const dataSource = await this.catalog.get();
    return dataSource.transaction((manager) => fn(manager));
  }

  private async withRunner<T>(
    mode: ReplicationMode,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner(mode);
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }
}
