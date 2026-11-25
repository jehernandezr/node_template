import type { CatalogDataSource } from '@platform/persistence';
import type { EntityManager } from 'typeorm';

/**
 * Base for the repositories of identity's indexes in the global catalog (emails, credentials,
 * slugs, prefixes). They are tables without their own id or version, so they do not use `CatalogRepository`.
 */
export abstract class CatalogTableRepository {
  protected constructor(private readonly catalog: CatalogDataSource) {}

  /** Reads from the primary: an index is queried right after it is written. */
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
