import { ManagerIntent, type CatalogDataSource } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import { CatalogClaimManagers } from '../database/catalog-claim-managers.js';
import { CatalogEntityManagers } from '../database/catalog-entity-managers.js';

/** Catalog that records where each call went instead of opening connections. */
class RecordingCatalogEntityManagers extends CatalogEntityManagers {
  readonly calls: string[] = [];
  private readonly manager = {} as EntityManager;

  constructor() {
    super({} as CatalogDataSource);
  }

  override read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    this.calls.push('read');
    return fn(this.manager);
  }

  override readPrimary<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    this.calls.push('read-primary');
    return fn(this.manager);
  }

  override write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    this.calls.push('write');
    return fn(this.manager);
  }
}

describe('CatalogClaimManagers', () => {
  it.each([
    [ManagerIntent.Write, 'write'],
    [ManagerIntent.ReadPrimary, 'read-primary'],
    [ManagerIntent.Read, 'read'],
  ])('runs %s against the matching catalog manager', async (intent, call) => {
    const catalog = new RecordingCatalogEntityManagers();
    const managers = new CatalogClaimManagers(catalog);

    await expect(managers.run(intent, async () => 7)).resolves.toBe(7);

    expect(catalog.calls).toEqual([call]);
  });

  it('sweeps the catalog in one write', async () => {
    const catalog = new RecordingCatalogEntityManagers();

    await expect(
      new CatalogClaimManagers(catalog).sweep(async () => 3),
    ).resolves.toBe(3);

    expect(catalog.calls).toEqual(['write']);
  });
});
