import type { CatalogDataSource } from '@platform/persistence';
import type { EntityManager, ReplicationMode } from 'typeorm';

/** Gives the global catalog stores the `EntityManager` of their `DataSource`: replica, primary or transaction. */
export class CatalogEntityManagers {
  constructor(private readonly catalog: CatalogDataSource) {}

  /**
   * Reads with a manager of the catalog replica.
   * @param fn Work with the manager.
   * @returns What `fn` returns.
   */
  async read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.withRunner('slave', fn);
  }

  /**
   * Reads from the catalog primary: for what was just committed and for decisions that do not tolerate replica lag.
   * @param fn Work with the manager.
   * @returns What `fn` returns.
   */
  async readPrimary<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.withRunner('master', fn);
  }

  /**
   * Writes in a transaction on the catalog primary.
   * @param fn Work with the manager.
   * @returns What `fn` returns.
   */
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
