import type { CatalogDataSource } from '@platform/persistence';
import type { EntityManager } from 'typeorm';

/**
 * Base de los repositorios de los índices de identity en el catálogo global (emails, credenciales,
 * slugs, prefijos). Son tablas sin id propio ni versión, así que no usan `CatalogRepository`.
 */
export abstract class CatalogTableRepository {
  protected constructor(private readonly catalog: CatalogDataSource) {}

  /** Lee del primario: un índice se consulta justo después de escribirse. */
  protected async read<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner('master');
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }

  protected async write<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.catalog.get();
    return dataSource.transaction((manager) => fn(manager));
  }
}
